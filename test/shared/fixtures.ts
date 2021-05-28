import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import DAOfiV2Pair from '../../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

const proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317'

interface FactoryFixture {
  factory: Contract
}

export async function factoryFixture(): Promise<FactoryFixture> {
  const Factory = await ethers.getContractFactory("DAOfiV2Factory")
  const factory = await Factory.deploy()
  return { factory }
}

interface PairFixture extends FactoryFixture {
  pair: Contract
}

export async function pairFixture(
  wallet: SignerWithAddress,
  name: string,
  symbol: string,
  baseURI: string,
  reserve: number = 10,
  x: number = 1,
  m: number = 1e6,
  n: number = 1,
  ownerFee: number = 0
): Promise<PairFixture> {
  const { factory } = await factoryFixture()
  await factory.createPair(
    name, symbol, baseURI, proxy, wallet.address, reserve, x, m, n, ownerFee
  )
  const pairAddress = await factory.getPair(wallet.address, symbol)
  const pair = new Contract(pairAddress, DAOfiV2Pair.abi, wallet)
  return { factory, pair }
}
