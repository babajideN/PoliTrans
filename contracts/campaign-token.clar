;; PoliTrans Campaign Token Contract
;; Clarity v2
;; Implements SIP-10 compliant fungible token with minting, burning, transferring,
;; approvals, staking for governance, admin controls, and campaign-specific supply limits.
;; Designed for political campaigns to issue donor tokens that grant governance rights.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-INSUFFICIENT-STAKE u102)
(define-constant ERR-MAX-SUPPLY-REACHED u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-INVALID-AMOUNT u106)
(define-constant ERR-INSUFFICIENT-ALLOWANCE u107)
(define-constant ERR-SELF-APPROVAL u108)

;; Token metadata (SIP-10 compliant)
(define-constant TOKEN-NAME "PoliTrans Campaign Token")
(define-constant TOKEN-SYMBOL "PCT")
(define-constant TOKEN-DECIMALS u6)
(define-constant TOKEN-URI none) ;; Optional URI for metadata

;; Contract state variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var total-supply uint u0)
(define-data-var campaign-goal uint u100000000) ;; Adjustable campaign goal (max supply), default 100M

;; Maps for balances, stakes, and allowances
(define-map balances principal uint)
(define-map staked-balances principal uint)
(define-map allowances { owner: principal, spender: principal } uint)

;; Private helper: Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: Ensure contract is not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: Validate non-zero address
(define-private (validate-address (addr principal))
  (asserts! (not (is-eq addr 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
)

;; Private helper: Validate positive amount
(define-private (validate-amount (amount uint))
  (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
)

;; Transfer admin rights to a new principal
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (validate-address new-admin)
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause or unpause the contract (affects transfers, stakes, etc.)
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Set the campaign goal (max supply limit)
(define-public (set-campaign-goal (new-goal uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= new-goal (var-get total-supply)) (err ERR-MAX-SUPPLY-REACHED)) ;; Cannot set below current supply
    (var-set campaign-goal new-goal)
    (ok new-goal)
  )
)

;; Mint new tokens to a recipient (admin only)
(define-public (mint (recipient principal) (amount uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (validate-address recipient)
    (validate-amount amount)
    (let ((new-supply (+ (var-get total-supply) amount)))
      (asserts! (<= new-supply (var-get campaign-goal)) (err ERR-MAX-SUPPLY-REACHED))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (var-set total-supply new-supply)
      (ok true)
    )
  )
)

;; Burn tokens from caller's balance
(define-public (burn (amount uint))
  (begin
    (ensure-not-paused)
    (validate-amount amount)
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (var-set total-supply (- (var-get total-supply) amount))
      (ok true)
    )
  )
)

;; Transfer tokens to a recipient
(define-public (transfer (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (validate-address recipient)
    (validate-amount amount)
    (let ((sender-balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= sender-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- sender-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (ok true)
    )
  )
)

;; Approve a spender to transfer tokens on behalf of the owner
(define-public (approve (spender principal) (amount uint))
  (begin
    (ensure-not-paused)
    (validate-address spender)
    (asserts! (not (is-eq spender tx-sender)) (err ERR-SELF-APPROVAL))
    (map-set allowances { owner: tx-sender, spender: spender } amount)
    (ok true)
  )
)

;; Transfer tokens from one principal to another using allowance
(define-public (transfer-from (owner principal) (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (validate-address owner)
    (validate-address recipient)
    (validate-amount amount)
    (let ((allowance (default-to u0 (map-get? allowances { owner: owner, spender: tx-sender })))
          (owner-balance (default-to u0 (map-get? balances owner))))
      (asserts! (>= allowance amount) (err ERR-INSUFFICIENT-ALLOWANCE))
      (asserts! (>= owner-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set allowances { owner: owner, spender: tx-sender } (- allowance amount))
      (map-set balances owner (- owner-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (ok true)
    )
  )
)

;; Increase the allowance for a spender
(define-public (increase-allowance (spender principal) (added-amount uint))
  (begin
    (ensure-not-paused)
    (validate-address spender)
    (validate-amount added-amount)
    (let ((current-allowance (default-to u0 (map-get? allowances { owner: tx-sender, spender: spender }))))
      (map-set allowances { owner: tx-sender, spender: spender } (+ current-allowance added-amount))
      (ok true)
    )
  )
)

;; Decrease the allowance for a spender
(define-public (decrease-allowance (spender principal) (subtracted-amount uint))
  (begin
    (ensure-not-paused)
    (validate-address spender)
    (validate-amount subtracted-amount)
    (let ((current-allowance (default-to u0 (map-get? allowances { owner: tx-sender, spender: spender }))))
      (asserts! (>= current-allowance subtracted-amount) (err ERR-INSUFFICIENT-ALLOWANCE))
      (map-set allowances { owner: tx-sender, spender: spender } (- current-allowance subtracted-amount))
      (ok true)
    )
  )
)

;; Stake tokens for governance influence
(define-public (stake (amount uint))
  (begin
    (ensure-not-paused)
    (validate-amount amount)
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (map-set staked-balances tx-sender (+ amount (default-to u0 (map-get? staked-balances tx-sender))))
      (ok true)
    )
  )
)

;; Unstake tokens back to balance
(define-public (unstake (amount uint))
  (begin
    (ensure-not-paused)
    (validate-amount amount)
    (let ((stake-balance (default-to u0 (map-get? staked-balances tx-sender))))
      (asserts! (>= stake-balance amount) (err ERR-INSUFFICIENT-STAKE))
      (map-set staked-balances tx-sender (- stake-balance amount))
      (map-set balances tx-sender (+ amount (default-to u0 (map-get? balances tx-sender))))
      (ok true)
    )
  )
)

;; Read-only: Get token name (SIP-10)
(define-read-only (get-name)
  (ok TOKEN-NAME)
)

;; Read-only: Get token symbol (SIP-10)
(define-read-only (get-symbol)
  (ok TOKEN-SYMBOL)
)

;; Read-only: Get token decimals (SIP-10)
(define-read-only (get-decimals)
  (ok TOKEN-DECIMALS)
)

;; Read-only: Get balance of an account (SIP-10)
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

;; Read-only: Get staked balance of an account
(define-read-only (get-staked-balance (account principal))
  (ok (default-to u0 (map-get? staked-balances account)))
)

;; Read-only: Get total supply (SIP-10)
(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

;; Read-only: Get allowance between owner and spender
(define-read-only (get-allowance (owner principal) (spender principal))
  (ok (default-to u0 (map-get? allowances { owner: owner, spender: spender })))
)

;; Read-only: Get current admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: Check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: Get current campaign goal
(define-read-only (get-campaign-goal)
  (ok (var-get campaign-goal))
)

;; Read-only: Get token URI (SIP-10 optional)
(define-read-only (get-token-uri)
  (ok TOKEN-URI)
)