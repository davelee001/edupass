#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

// Storage keys
#[contracttype]
pub enum DataKey {
    Admin,
    Credits(Address),      // Credits balance for beneficiary
    Allocations(Address),  // Allocation metadata
    TotalIssued,
}

// Credit allocation metadata
#[contracttype]
#[derive(Clone)]
pub struct Allocation {
    pub beneficiary: Address,
    pub issuer: Address,
    pub amount: i128,
    pub purpose: String,
    pub expires_at: u64,
}

#[contract]
pub struct EduPassToken;

#[contractimpl]
impl EduPassToken {
    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalIssued, &0i128);
    }

    /// Issue credits to a beneficiary
    pub fn issue_credits(
        env: Env,
        issuer: Address,
        beneficiary: Address,
        amount: i128,
        purpose: String,
        expires_at: u64,
    ) -> Allocation {
        issuer.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Get current balance
        let current: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Credits(beneficiary.clone()))
            .unwrap_or(0);

        // Update balance
        env.storage()
            .persistent()
            .set(&DataKey::Credits(beneficiary.clone()), &(current + amount));

        // Update total issued
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalIssued)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalIssued, &(total + amount));

        // Create allocation record
        let allocation = Allocation {
            beneficiary: beneficiary.clone(),
            issuer: issuer.clone(),
            amount,
            purpose: purpose.clone(),
            expires_at,
        };

        // Store allocation
        env.storage()
            .persistent()
            .set(&DataKey::Allocations(beneficiary.clone()), &allocation);

        allocation
    }

    /// Transfer credits from beneficiary to school
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Get sender balance
        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Credits(from.clone()))
            .unwrap_or(0);

        if from_balance < amount {
            panic!("Insufficient balance");
        }

        // Get recipient balance
        let to_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Credits(to.clone()))
            .unwrap_or(0);

        // Update balances
        env.storage()
            .persistent()
            .set(&DataKey::Credits(from.clone()), &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&DataKey::Credits(to.clone()), &(to_balance + amount));
    }

    /// Burn credits (redeem)
    pub fn burn(env: Env, account: Address, amount: i128) {
        account.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Credits(account.clone()))
            .unwrap_or(0);

        if balance < amount {
            panic!("Insufficient balance to burn");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Credits(account), &(balance - amount));
    }

    /// Get balance for an account
    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Credits(account))
            .unwrap_or(0)
    }

    /// Get allocation details
    pub fn get_allocation(env: Env, beneficiary: Address) -> Option<Allocation> {
        env.storage()
            .persistent()
            .get(&DataKey::Allocations(beneficiary))
    }

    /// Get total credits issued
    pub fn total_issued(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalIssued)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EduPassToken);
        let client = EduPassTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);
    }

    #[test]
    fn test_issue_and_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EduPassToken);
        let client = EduPassTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let school = Address::generate(&env);

        client.initialize(&admin);

        // Issue credits
        client.issue_credits(
            &issuer,
            &beneficiary,
            &1000,
            &String::from_str(&env, "Tuition"),
            &1735689600, // Expires Jan 1, 2025
        );

        assert_eq!(client.balance(&beneficiary), 1000);

        // Transfer to school
        client.transfer(&beneficiary, &school, &500);

        assert_eq!(client.balance(&beneficiary), 500);
        assert_eq!(client.balance(&school), 500);
    }

    #[test]
    fn test_burn() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EduPassToken);
        let client = EduPassTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let school = Address::generate(&env);

        client.initialize(&admin);

        // Issue credits to school
        client.issue_credits(
            &issuer,
            &school,
            &1000,
            &String::from_str(&env, "Received"),
            &1735689600,
        );

        // Burn credits
        client.burn(&school, &500);

        assert_eq!(client.balance(&school), 500);
    }
}
