#![cfg(test)]

use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

use crate::{Error, PaymentRouter, PaymentRouterClient};

fn setup() -> (Env, Address, Address, Address, Address, Address, PaymentRouterClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token);

    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);
    let treasury = Address::generate(&env);
    let reseller = Address::generate(&env);

    token_admin_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(PaymentRouter, ());
    let client = PaymentRouterClient::new(&env, &contract_id);

    (env, token, payer, merchant, treasury, reseller, client)
}

#[test]
fn pay_two_legs_without_reseller() {
    let (env, token, payer, merchant, treasury, _reseller, client) = setup();
    let intent = BytesN::from_array(&env, &[7u8; 32]);

    client.pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &990_000i128,
        &10_000i128,
        &0i128,
        &intent,
    );

    let token_client = token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&merchant), 990_000);
    assert_eq!(token_client.balance(&treasury), 10_000);
    assert_eq!(token_client.balance(&payer), 1_000_000_000 - 1_000_000);
}

#[test]
fn pay_three_legs_with_reseller() {
    let (env, token, payer, merchant, treasury, reseller, client) = setup();
    let intent = BytesN::from_array(&env, &[9u8; 32]);

    client.pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &Some(reseller.clone()),
        &920_000i128,
        &10_000i128,
        &70_000i128,
        &intent,
    );

    let token_client = token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&merchant), 920_000);
    assert_eq!(token_client.balance(&treasury), 10_000);
    assert_eq!(token_client.balance(&reseller), 70_000);
}

#[test]
fn rejects_non_positive_net() {
    let (env, token, payer, merchant, treasury, _, client) = setup();
    let intent = BytesN::from_array(&env, &[1u8; 32]);
    let err = client.try_pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &0i128,
        &1i128,
        &0i128,
        &intent,
    );
    assert_eq!(err, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn rejects_negative_fee() {
    let (env, token, payer, merchant, treasury, _, client) = setup();
    let intent = BytesN::from_array(&env, &[4u8; 32]);
    let err = client.try_pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &100i128,
        &-1i128,
        &0i128,
        &intent,
    );
    assert_eq!(err, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn rejects_reseller_fee_without_address() {
    let (env, token, payer, merchant, treasury, _, client) = setup();
    let intent = BytesN::from_array(&env, &[2u8; 32]);
    let err = client.try_pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &900i128,
        &10i128,
        &90i128,
        &intent,
    );
    assert_eq!(err, Err(Ok(Error::MissingReseller)));
}

#[test]
fn fee_zero_still_pays_merchant() {
    let (env, token, payer, merchant, treasury, _, client) = setup();
    let intent = BytesN::from_array(&env, &[5u8; 32]);

    client.pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &500i128,
        &0i128,
        &0i128,
        &intent,
    );

    let token_client = token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&merchant), 500);
    assert_eq!(token_client.balance(&treasury), 0);
}

#[test]
fn rejects_negative_reseller_fee() {
    let (env, token, payer, merchant, treasury, reseller, client) = setup();
    let intent = BytesN::from_array(&env, &[6u8; 32]);
    let err = client.try_pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &Some(reseller),
        &900i128,
        &10i128,
        &-5i128,
        &intent,
    );
    assert_eq!(err, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn same_intent_id_allows_multiple_pays_abonos() {
    // Product abonos: API sums Paid events; contract does not unique intent_id.
    let (env, token, payer, merchant, treasury, _, client) = setup();
    let intent = BytesN::from_array(&env, &[9u8; 32]);

    client.pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &400_000i128,
        &4_040i128,
        &0i128,
        &intent,
    );
    client.pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &590_000i128,
        &5_960i128,
        &0i128,
        &intent,
    );

    let token_client = token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&merchant), 990_000);
    assert_eq!(token_client.balance(&treasury), 10_000);
}

#[test]
fn rejects_negative_net() {
    let (env, token, payer, merchant, treasury, _, client) = setup();
    let intent = BytesN::from_array(&env, &[8u8; 32]);
    let err = client.try_pay(
        &token,
        &payer,
        &merchant,
        &treasury,
        &None,
        &-1i128,
        &1i128,
        &0i128,
        &intent,
    );
    assert_eq!(err, Err(Ok(Error::InvalidAmount)));
}
