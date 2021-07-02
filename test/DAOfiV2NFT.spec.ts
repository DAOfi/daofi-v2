import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'

const proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317' //OpenSea Rinkeby proxy
let wallet: SignerWithAddress
let NFT: ContractFactory
let nft: Contract

describe('DAOfiV2NFT', async () => {
  let nft: Contract

  beforeEach(async () => {
    wallet = (await ethers.getSigners())[0]
    NFT = await ethers.getContractFactory('DAOfiV2NFT')
  })

  it('constructor', async () => {
    await expect(
        NFT.deploy('Test NFT', 'TNFT', '', wallet.address, proxy, 100)
    ).to.be.revertedWith('EMPTY_URI')
    await expect(
        NFT.deploy('Test NFT', 'TNFT', 'https://fake', ethers.constants.AddressZero, proxy, 100)
    ).to.be.revertedWith('ZERO_OWNER')
    await expect(
        NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, ethers.constants.AddressZero, 100)
    ).to.be.revertedWith('ZERO_PROXY')
    await expect(
        NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 0)
    ).to.be.revertedWith('ZERO_SUPPLY')
    await expect(NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)).to.not.be.reverted
  })

  it('mint', async () => {
    let wallet2 = (await ethers.getSigners())[1]
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 10)
    nft = nft.connect(wallet2)
    await expect(nft.mint(wallet2.address)).to.be.revertedWith('OWNER_ONLY')
    nft = nft.connect(wallet)
    await expect(nft.preMint(wallet.address, 10)).to.emit(nft, 'PreMint')
    await expect(nft.mint(wallet2.address)).to.be.revertedWith('MAX_MINT')
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 10)
    await expect(nft.mint(wallet.address)).to.emit(nft, 'Transfer')
  })

  it('preMint', async () => {
    let wallet2 = (await ethers.getSigners())[1]
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)
    nft = nft.connect(wallet2)
    await expect(nft.preMint(wallet2.address, 10)).to.be.revertedWith('OWNER_ONLY')
    nft = nft.connect(wallet)
    await expect(nft.mint(wallet.address)).to.emit(nft, 'Transfer')
    await expect(nft.preMint(wallet.address, 10)).to.be.revertedWith('PREMINT_UNAVAILABLE')
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)
    await expect(nft.preMint(wallet.address, 10)).to.emit(nft, 'PreMint')
      .withArgs(wallet.address, 10)
    await expect(nft.preMint(wallet.address, 10)).to.be.revertedWith('DOUBLE_PREMINT')
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)
    await expect(nft.preMint(wallet.address, 101)).to.be.revertedWith('PREMINT_EXCESS')
  })

  it('setOwner', async () => {
    let wallet2 = (await ethers.getSigners())[1]
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)
    nft = nft.connect(wallet2)
    await expect(nft.setOwner(wallet2.address)).to.be.revertedWith('OWNER_ONLY')
    nft = nft.connect(wallet)
    await expect(nft.setOwner(ethers.constants.AddressZero)).to.be.revertedWith('ZERO_OWNER')
    await expect(nft.setOwner(wallet2.address)).to.emit(nft, 'SetOwner')
      .withArgs(wallet.address, wallet2.address)
  })

  it('gas for deoploy', async () => {
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)
    const receipt = await nft.deployTransaction.wait()
    expect(receipt.gasUsed).to.eq(3126988)
  })

  it('gas for mint', async () => {
    nft = await NFT.deploy('Test NFT', 'TNFT', 'https://fake', wallet.address, proxy, 100)
    const tx = await nft.mint(wallet.address);
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(194475)
  })
})
