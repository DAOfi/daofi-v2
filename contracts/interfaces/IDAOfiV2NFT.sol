// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IDAOfiV2NFT {
    event PreMint( address indexed to, uint256 amount);
    event SetOwner(address indexed sender, address indexed newOwner);

    function ownerAddress() external view returns (address payable);
    function preMintSupply() external view returns (uint256);
    function maxSupply() external view returns (uint256);
    function preMint(address to, uint256 count) external;
    function mint(address to) external returns (uint256);
}
