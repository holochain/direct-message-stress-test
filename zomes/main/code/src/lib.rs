#![feature(proc_macro_hygiene)]
#![allow(unreachable_code)]
use hdk_proc_macros::zome;
use hdk::prelude::*;

#[zome]
mod my_zome {

    #[init]
    fn init() {
        Ok(())
    }

    #[validate_agent]
    pub fn validate_agent(validation_data: EntryValidationData<AgentId>) {
        Ok(())
    }

    #[entry_def]
    pub fn entry_a() -> ValidatingEntryType {
        entry!(
            name: "entry_a",
            description: "an entry to trigger full chain validation",
            sharing: Sharing::Public,
            validation_package: || {
                hdk::ValidationPackageDefinition::ChainFull
            },
            validation: |_validation_data: hdk::EntryValidationData<String>| {
                 Ok(())
            }
        )
    }

    #[zome_fn("hc_public")]
    pub fn send_message(to: Address) -> ZomeApiResult<String> {
        hdk::send(to, "".to_string(), 60000.into())
    }

    #[zome_fn("hc_public")]
    pub fn commit_a() -> ZomeApiResult<Address> {
        hdk::commit_entry(&Entry::App("entry_a".into(), "".into()))
    }

    #[receive]
    pub fn receive(_sender: Address, _payload: String) -> String {
        panic!("");
        String::from("not reachable")
    }

}
