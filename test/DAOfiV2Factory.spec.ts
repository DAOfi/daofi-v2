import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { factoryFixture } from './shared/fixtures'

const proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317'
let wallet: SignerWithAddress

describe('DAOfiV2Factory', async () => {
  let factory: Contract

  beforeEach(async () => {
    wallet = (await ethers.getSigners())[0]
    factory = (await factoryFixture()).factory
  })

  it('reverts and succeeds when calling createPair', async () => {
    await expect(
      factory.createPair('Test NFT', 'TNFT', 'https://fake', proxy, wallet.address, 10, 1, 1, 1, 100)
    ).to.emit(factory, 'PairCreated')

    await expect(
      factory.createPair('Test NFT', 'TNFT', 'https://fake', proxy, ethers.constants.AddressZero, 10, 1, 1, 1, 100)
    ).to.be.revertedWith('ZERO_OWNER_ADDRESS')
    await expect(
      factory.createPair('Test NFT', '', 'https://fake', proxy, wallet.address, 10, 1, 1, 1, 100)
    ).to.be.revertedWith('EMPTY_SYMBOL')
    await expect(
      factory.createPair('Test NFT', 'TNFT', 'https://fake', proxy, wallet.address, 10, 1, 1, 1, 100)
    ).to.be.revertedWith('PAIR_EXISTS')
  })

  it('correctly estimates gas for calling createPair', async () => {
    const tx = await factory.createPair('Test NFT', 'TNFT', 'https://fake', proxy, wallet.address, 10, 1, 1, 1, 100)
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(3498027)
  })
})
