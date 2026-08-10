OpenSky/chain
===============

## For deployment to dev/stg/prod

1. Update deployer mnemonics/infura keys in `config/(DEV|STG|PROD).env`
2. Ensure deploy has enough funds to cover tx fees
3. (Different terminal) `pnpm deploy NETWORK(matic|rinkeby|mumbai|...)`
