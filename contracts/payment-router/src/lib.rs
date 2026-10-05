#![no_std]

use soroban_sdk::{contract, contracterror, contractevent, contractimpl, Address, BytesN, Env, token};

/// Splits a SAC (SEP-41) payment three ways: net to the merchant, ViaPay's fee to
/// the treasury, and an optional reseller cut.
/// Classic USDC is paid through its Stellar Asset Contract, not via classic `payment`.
/// The checkout keeps the classic multi-op path until `PAYMENT_ROUTER_CONTRACT_ID` is set.
#[contract]
pub struct PaymentRouter;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    MissingReseller = 2,
}

#[contractevent]
pub struct Paid {
    #[topic]
    pub merchant: Address,
    pub intent_id: BytesN<32>,
    pub net: i128,
    pub fee: i128,
    pub reseller_fee: i128,
}

#[contractimpl]
impl PaymentRouter {
    /// `reseller` is only read when `reseller_fee` is positive, so a cobro with no
    /// reseller passes `None` and pays exactly two legs.
    pub fn pay(
        env: Env,
        token: Address,
        payer: Address,
        merchant: Address,
        treasury: Address,
        reseller: Option<Address>,
        net: i128,
        fee: i128,
        reseller_fee: i128,
        intent_id: BytesN<32>,
    ) -> Result<(), Error> {
        if net <= 0 || fee < 0 || reseller_fee < 0 {
            return Err(Error::InvalidAmount);
        }
        if reseller_fee > 0 && reseller.is_none() {
            return Err(Error::MissingReseller);
        }
        payer.require_auth();
        let client = token::Client::new(&env, &token);
        client.transfer(&payer, &merchant, &net);
        if fee > 0 {
            client.transfer(&payer, &treasury, &fee);
        }
        if reseller_fee > 0 {
            // Checked above: a positive reseller fee always carries an address.
            let to = reseller.unwrap();
            client.transfer(&payer, &to, &reseller_fee);
        }
        Paid {
            merchant,
            intent_id,
            net,
            fee,
            reseller_fee,
        }
        .publish(&env);
        Ok(())
    }
}
