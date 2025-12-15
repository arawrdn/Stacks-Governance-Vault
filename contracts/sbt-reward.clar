;; sbt-reward.clar
;; Smart contract for managing and distributing sBTC rewards.

;; Custom Errors
(define-constant err-not-authorized (err u200))
(define-constant err-already-rewarded (err u202))

;; Data Maps
(define-map rewarded-proposals uint bool) 

;; Data Variables
;; IMPORTANT: Replace with the actual address of the deployed vote-manager contract
(define-data-var vote-manager-contract principal 'SP000000000000000000002Q6VF7J.vote-manager) 
(define-data-var dao-owner principal tx-sender)
(define-data-var reward-amount uint u1000) ;; Example reward amount in micro-sBTC

;; --- Public Functions ---

;; @desc Called only by the VoteManager contract after a successful execution.
;; @param proposal-id The ID of the executed proposal.
;; @param recipient The principal who receives the reward (e.g., the proposer).
(define-public (distribute-proposal-reward (proposal-id uint) (recipient principal))
    (begin
        ;; Only the VoteManager contract can trigger this function (using tx-sender comparison)
        (asserts! (is-eq tx-sender (var-get vote-manager-contract)) err-not-authorized)
        
        (asserts! (is-none (map-get? rewarded-proposals proposal-id)) err-already-rewarded)

        (map-set rewarded-proposals proposal-id true)

        ;; *** sBTC TRANSFER LOGIC ***
        ;; In a real setup, this is where you would call the sBTC token contract
        ;; to transfer `reward-amount` from this contract's balance to the `recipient`.
        
        ;; (try! (contract-call? 'SP1R9...SBT-TOKEN transfer (var-get reward-amount) tx-sender recipient none))
        
        (print {event: "REWARD_DISTRIBUTED", id: proposal-id, amount: (var-get reward-amount), recipient: recipient})
        
        (ok true)
    )
)
