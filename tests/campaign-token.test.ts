import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
  admin: string;
  paused: boolean;
  totalSupply: bigint;
  campaignGoal: bigint;
  balances: Map<string, bigint>;
  staked: Map<string, bigint>;
  allowances: Map<string, bigint>; // Key: `${owner}-${spender}`
  isAdmin(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setCampaignGoal(caller: string, newGoal: bigint): { value: bigint } | { error: number };
  mint(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  burn(caller: string, amount: bigint): { value: boolean } | { error: number };
  transfer(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  approve(caller: string, spender: string, amount: bigint): { value: boolean } | { error: number };
  transferFrom(caller: string, owner: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  increaseAllowance(caller: string, spender: string, addedAmount: bigint): { value: boolean } | { error: number };
  decreaseAllowance(caller: string, spender: string, subtractedAmount: bigint): { value: boolean } | { error: number };
  stake(caller: string, amount: bigint): { value: boolean } | { error: number };
  unstake(caller: string, amount: bigint): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  totalSupply: 0n,
  campaignGoal: 100_000_000n,
  balances: new Map<string, bigint>(),
  staked: new Map<string, bigint>(),
  allowances: new Map<string, bigint>(),

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  setCampaignGoal(caller: string, newGoal: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newGoal < this.totalSupply) return { error: 103 };
    this.campaignGoal = newGoal;
    return { value: newGoal };
  },

  mint(caller: string, recipient: string, amount: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (amount <= 0n) return { error: 106 };
    if (this.totalSupply + amount > this.campaignGoal) return { error: 103 };
    this.balances.set(recipient, (this.balances.get(recipient) ?? 0n) + amount);
    this.totalSupply += amount;
    return { value: true };
  },

  burn(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) ?? 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.totalSupply -= amount;
    return { value: true };
  },

  transfer(caller: string, recipient: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) ?? 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) ?? 0n) + amount);
    return { value: true };
  },

  approve(caller: string, spender: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (spender === caller) return { error: 108 };
    this.allowances.set(`${caller}-${spender}`, amount);
    return { value: true };
  },

  transferFrom(caller: string, owner: string, recipient: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const allowanceKey = `${owner}-${caller}`;
    const allowance = this.allowances.get(allowanceKey) ?? 0n;
    if (allowance < amount) return { error: 107 };
    const ownerBal = this.balances.get(owner) ?? 0n;
    if (ownerBal < amount) return { error: 101 };
    this.allowances.set(allowanceKey, allowance - amount);
    this.balances.set(owner, ownerBal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) ?? 0n) + amount);
    return { value: true };
  },

  increaseAllowance(caller: string, spender: string, addedAmount: bigint) {
    if (this.paused) return { error: 104 };
    if (addedAmount <= 0n) return { error: 106 };
    const allowanceKey = `${caller}-${spender}`;
    const current = this.allowances.get(allowanceKey) ?? 0n;
    this.allowances.set(allowanceKey, current + addedAmount);
    return { value: true };
  },

  decreaseAllowance(caller: string, spender: string, subtractedAmount: bigint) {
    if (this.paused) return { error: 104 };
    if (subtractedAmount <= 0n) return { error: 106 };
    const allowanceKey = `${caller}-${spender}`;
    const current = this.allowances.get(allowanceKey) ?? 0n;
    if (current < subtractedAmount) return { error: 107 };
    this.allowances.set(allowanceKey, current - subtractedAmount);
    return { value: true };
  },

  stake(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) ?? 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.staked.set(caller, (this.staked.get(caller) ?? 0n) + amount);
    return { value: true };
  },

  unstake(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const stakeBal = this.staked.get(caller) ?? 0n;
    if (stakeBal < amount) return { error: 102 };
    this.staked.set(caller, stakeBal - amount);
    this.balances.set(caller, (this.balances.get(caller) ?? 0n) + amount);
    return { value: true };
  },
};

describe("PoliTrans Campaign Token", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.totalSupply = 0n;
    mockContract.campaignGoal = 100_000_000n;
    mockContract.balances = new Map();
    mockContract.staked = new Map();
    mockContract.allowances = new Map();
  });

  it("should allow admin to set campaign goal", () => {
    const result = mockContract.setCampaignGoal(mockContract.admin, 200_000_000n);
    expect(result).toEqual({ value: 200_000_000n });
    expect(mockContract.campaignGoal).toBe(200_000_000n);
  });

  it("should prevent non-admin from setting campaign goal", () => {
    const result = mockContract.setCampaignGoal("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 200_000_000n);
    expect(result).toEqual({ error: 100 });
  });

  it("should mint tokens when called by admin", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 1000n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(1000n);
    expect(mockContract.totalSupply).toBe(1000n);
  });

  it("should prevent minting over campaign goal", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 200_000_000n);
    expect(result).toEqual({ error: 103 });
  });

  it("should burn tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 500n);
    const result = mockContract.burn("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(300n);
    expect(mockContract.totalSupply).toBe(300n);
  });

  it("should transfer tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 500n);
    const result = mockContract.transfer("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(300n);
    expect(mockContract.balances.get("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP")).toBe(200n);
  });

  it("should approve allowance", () => {
    const result = mockContract.approve("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 300n);
    expect(result).toEqual({ value: true });
    expect(mockContract.allowances.get(`${"ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5"}-${"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"}`)).toBe(300n);
  });

  it("should transfer from using allowance", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 500n);
    mockContract.approve("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 200n);
    const result = mockContract.transferFrom("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST4JTJN3H6BXL3P8RZ3ZGH1A7ZP1NZDWJ4N7X2KQ", 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(400n);
    expect(mockContract.balances.get("ST4JTJN3H6BXL3P8RZ3ZGH1A7ZP1NZDWJ4N7X2KQ")).toBe(100n);
    expect(mockContract.allowances.get(`${"ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5"}-${"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"}`)).toBe(100n);
  });

  it("should increase allowance", () => {
    mockContract.approve("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 100n);
    const result = mockContract.increaseAllowance("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 50n);
    expect(result).toEqual({ value: true });
    expect(mockContract.allowances.get(`${"ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5"}-${"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"}`)).toBe(150n);
  });

  it("should decrease allowance", () => {
    mockContract.approve("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 100n);
    const result = mockContract.decreaseAllowance("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 30n);
    expect(result).toEqual({ value: true });
    expect(mockContract.allowances.get(`${"ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5"}-${"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"}`)).toBe(70n);
  });

  it("should stake tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 500n);
    const result = mockContract.stake("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(300n);
    expect(mockContract.staked.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(200n);
  });

  it("should unstake tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 500n);
    mockContract.stake("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 200n);
    const result = mockContract.unstake("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.staked.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(100n);
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5")).toBe(400n);
  });

  it("should not allow operations when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const transferResult = mockContract.transfer("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 10n);
    expect(transferResult).toEqual({ error: 104 });
    const stakeResult = mockContract.stake("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 10n);
    expect(stakeResult).toEqual({ error: 104 });
  });

  it("should prevent invalid amounts", () => {
    const mintResult = mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 0n);
    expect(mintResult).toEqual({ error: 106 });
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", 100n);
    const transferResult = mockContract.transfer("ST2CY5V39NHDP5P0TP4KSAN0QQMWRST73ANM862Q5", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 0n);
    expect(transferResult).toEqual({ error: 106 });
  });
});