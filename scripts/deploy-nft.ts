import { ethers } from 'ethers'
import DAOfiV2Factory from '../build/contracts/DAOfiV2Factory.sol/DAOfiV2Factory.json'
import DAOfiV2Pair from '../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const factory = new ethers.Contract(
    process.env.FACTORY || '0x4e628C710f6a76CF695FB01Dc65dc7DE74D461e9',
    DAOfiV2Factory.abi,
    wallet
  )
  console.log('Factory:', factory.address)

  const pairTx = await factory.createPair(
    'Communifty Test NFT',
    'TESTNFT',
    'https://api.hodlink.io/4_20_21/',
    process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317',
    wallet.address,
    100, // tokens
    1, // start x
    1e6, // m
    2, // n
    50, // fee
    {
      gasLimit: 8000000,
      gasPrice: ethers.utils.parseUnits('20', 'gwei'),
    }
  )

  await pairTx.wait()
  const pairAddr = await factory.getPair(wallet.address, 'TESTNFT')
  console.log('Pair created:', pairAddr)
  const pair = new ethers.Contract(pairAddr, DAOfiV2Pair.abi, wallet)

  await pair.preMint(10, {
    gasLimit: 8000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  console.log('Preminted 10')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
