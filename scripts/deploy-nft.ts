import { Contract, ethers } from 'ethers'
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
      'ipfs://QmRRkBgZh3H52BLfYh2ebG7ufERRw2dqidTJUkP6VtxYcs/karma_metadata/',
      process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317',
      wallet.address,
      503, // tokens
      50, // start x
      100, // m
      2, // n
      50, // fee
    ],
    {
      gasLimit: 15000000,
      gasPrice: ethers.utils.parseUnits('20', 'gwei'),
    }
  )

  //const pair = new Contract('0xc95A9691806C23365e4F12674A315AB08d2829Fa', DAOfiV2Pair.abi, wallet)

  console.log('Pair:', pair.address)

  let tx = await pair.preMint(100, wallet.address, {
    gasLimit: 15000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  await tx.wait()

  tx = await pair.preMint(100, wallet.address, {
    gasLimit: 15000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  await tx.wait()

  tx = await pair.preMint(100, wallet.address, {
    gasLimit: 15000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  await tx.wait()

  tx = await pair.preMint(100, wallet.address, {
    gasLimit: 15000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  await tx.wait()

  tx = await pair.preMint(65, wallet.address, {
    gasLimit: 15000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  await tx.wait()

  console.log('Pre-minted:', (await pair.balanceOf(wallet.address)).toNumber())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })