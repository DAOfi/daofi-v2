import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { factoryFixture } from './shared/fixtures'

let wallet: SignerWithAddress

describe('DAOfiV2Factory', async () => {
  let factory: Contract

  beforeEach(async () => {
    wallet = (await ethers.getSigners())[0]
    factory = (await factoryFixture()).factory
  })

  it('createPair: reverts and success', async () => {
    await expect(factory.createPair('Test NFT', 'TNFT', 'https://fake', '0xf57b2c51ded3a29e6891aba85459d600256cf317', wallet.address, 10, 1, 1, 1, 100))
      .to.emit(factory, 'PairCreated')

    await expect(factory.createPair('Test NFT', 'TNFT', 'https://fake', '0xf57b2c51ded3a29e6891aba85459d600256cf317', ethers.constants.AddressZero, 10, 1, 1, 1, 100)).to.be.reverted // ZERO_OWNER_ADDRESS
    await expect(factory.createPair('Test NFT', '', 'https://fake', '0xf57b2c51ded3a29e6891aba85459d600256cf317', wallet.address, 10, 1, 1, 1, 100)).to.be.reverted // EMPTY_SYMBOL
    await expect(factory.createPair('Test NFT', 'TNFT', 'https://fake', '0xf57b2c51ded3a29e6891aba85459d600256cf317', wallet.address, 10, 1, 1, 1, 100)).to.be.reverted // PAIR_EXISTS
  })

  it('createPair: gas estimate', async () => {
    const tx = await factory.createPair('Test NFT', 'TNFT', 'https://fake', '0xf57b2c51ded3a29e6891aba85459d600256cf317', wallet.address, 10, 1, 1, 1, 100)
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(3440273)
  })
})
