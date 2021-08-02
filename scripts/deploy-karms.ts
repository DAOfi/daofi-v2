import { Contract, ethers } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import DAOfiV2Pair from '../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL ||
      'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const recipient = process.env.OWNER || wallet.address
  const gas = process.env.GAS || '50'
  const proxy =
    process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317' // Default Rinkeby // Mainnet 0xa5409ec958c83c3f309868babaca7c86dcb077c1
  const nonce = await wallet.getTransactionCount()

  console.log('Proxy:', proxy)
  console.log('Recipient:', recipient)
  console.log('Gas:', gas)
  console.log('Nonce:', nonce)

  // const pair = await deployContract(
  //   wallet,
  //   DAOfiV2Pair,
  //   [
  //     'Karma DAO',
  //     'KARMA',
  //     'ipfs://QmRRkBgZh3H52BLfYh2ebG7ufERRw2dqidTJUkP6VtxYcs/karma_metadata/',
  //     proxy,
  //     wallet.address,
  //     503, // tokens
  //     50, // start x
  //     100, // m
  //     2, // n
  //     50, // fee
  //   ],
  //   {
  //     gasLimit: 10000000,
  //     gasPrice: ethers.utils.parseUnits(gas, 'gwei'),
  //     nonce
  //   }
  // )

  // const pair = new Contract('0xc95A9691806C23365e4F12674A315AB08d2829Fa', DAOfiV2Pair.abi, wallet) // Rinkeby
  const pair = new Contract(
    '0x32093ef03141eac8bfad7119fc37ad9985efe763',
    DAOfiV2Pair.abi,
    wallet
  ) // Mainnet

  console.log('Pair:', pair.address)

  // let tx = await pair.preMint(65, recipient, {
  //   gasLimit: 10000000,
  //   gasPrice: ethers.utils.parseUnits(gas, 'gwei'),
  //   nonce,
  // })

  // await tx.wait()

  console.log('Pre-minted:', (await pair.balanceOf(recipient)).toNumber())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
