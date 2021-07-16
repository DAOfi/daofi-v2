import { ethers } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import DAOfiV2Pair from '../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const pair = await deployContract(
    wallet,
    DAOfiV2Pair,
    [
      'Karma DAO',
      'KARMA',
      'https://communifty.mypinata.cloud/ipfs/QmSUa16ujtHGzYotUrwq5kN2ztLiqjapGKJihsAYhCSurn/karma_metadata/',
      process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317',
      wallet.address,
      503, // tokens
      1, // start x
      1000, // m
      2, // n
      50, // fee
    ],
    {
      gasLimit: 8000000,
      gasPrice: ethers.utils.parseUnits('20', 'gwei'),
    }
  )

  console.log('Pair:', pair.address)

  // await pair.preMint(10, wallet.address, {
  //   gasLimit: 8000000,
  //   gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  // })

  // console.log('Preminted 10')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })