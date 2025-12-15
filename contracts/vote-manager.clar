;; vote-manager.clar
;; Smart contract for DAO voting logic on Stacks.

(define-constant err-not-authorized (err u100))
(define-constant err-vote-period-active (err u101))
(define-constant err-no-such-proposal (err u102))
(define-constant err-already-voted (err u103))
(define-constant err-execution-failed (err u104))
(define-constant err-not-majority (err u105))

;; Data Maps
(define-map proposals uint ({
    proposer: principal,
    title: (string-ascii 128),
    start-block: uint,
    end-block: uint,
    yes-votes: uint,
    no-votes: uint,
    executed: bool
}))

(define-map votes-cast {proposal-id: uint, voter: principal} bool)

;; Data Variables
(define-data-var proposal-count uint u0)
(define-data-var dao-owner principal tx-sender)

;; --- Public Functions ---

;; @desc Submits a new proposal for voting.
;; @param title The title of the proposal (fetched from Sheets).
;; @param duration-blocks The voting period length in Stacks blocks.
(define-public (propose (title (string-ascii 128)) (duration-blocks uint))
    (begin
        (asserts! (is-eq tx-sender (var-get dao-owner)) err-not-authorized)
        
        (var-set proposal-count (+ (var-get proposal-count) u1))
        (let 
            ((new-id (var-get proposal-count)))
            (map-set proposals new-id {
                proposer: tx-sender,
                title: title,
                start-block: (get block-height),
                end-block: (+ (get block-height) duration-blocks),
                yes-votes: u0,
                no-votes: u0,
                executed: false
            })
            (print {event: "PROPOSAL_SUBMITTED", id: new-id, proposer: tx-sender, start: (get block-height), end: (+ (get block-height) duration-blocks)})
            (ok new-id)
        )
    )
)

;; @desc Casts a vote (Yes/No) on an active proposal.
(define-public (vote (proposal-id uint) (support bool))
    (let 
        ((proposal (map-get? proposals proposal-id)))
        (asserts! (is-some proposal) err-no-such-proposal)
        (let 
            ((p (unwrap-panic proposal)))
            (asserts! (> (get end-block p) (get block-height)) err-vote-period-active)
            (asserts! (is-none (map-get? votes-cast {proposal-id: proposal-id, voter: tx-sender})) err-already-voted)
            
            (map-set votes-cast {proposal-id: proposal-id, voter: tx-sender} true)
            
            (if support
                (map-set proposals proposal-id (merge p {yes-votes: (+ (get yes-votes p) u1)}))
                (map-set proposals proposal-id (merge p {no-votes: (+ (get no-votes p) u1)}))
            )
            
            (print {event: "VOTE_CAST", id: proposal-id, voter: tx-sender, support: support})
            (ok true)
        )
    )
)

;; @desc Executes a successful proposal after the voting period ends.
(define-public (execute-proposal (proposal-id uint))
    (let 
        ((proposal (map-get? proposals proposal-id)))
        (asserts! (is-some proposal) err-no-such-proposal)
        (let 
            ((p (unwrap-panic proposal)))
            (asserts! (>= (get block-height) (get end-block p)) err-vote-period-active)
            (asserts! (not (get executed p)) err-execution-failed) 
            
            ;; Requirement: Simple majority needed (Yes > No)
            (asserts! (> (get yes-votes p) (get no-votes p)) err-not-majority) 

            ;; Mark as executed
            (map-set proposals proposal-id (merge p {executed: true}))

            ;; Trigger the reward contract
            (as-contract (contract-call? 'SP000000000000000000002Q6VF7J.sbt-reward distribute-proposal-reward proposal-id (get proposer p)))

            ;; Emit event for Chainhook to trigger rewards logging and off-chain reporting
            (print {event: "PROPOSAL_EXECUTED", id: proposal-id, winner: "YES", block: (get block-height)})
            
            (ok true)
        )
    )
)

;; --- Read-Only Functions ---

(define-read-only (get-proposal-data (proposal-id uint))
    (ok (map-get? proposals proposal-id))
)

(define-read-only (get-voter-status (proposal-id uint) (voter principal))
    (ok (map-get? votes-cast {proposal-id: proposal-id, voter: voter}))
)
