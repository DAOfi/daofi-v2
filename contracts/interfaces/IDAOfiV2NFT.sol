// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol"

interface IDAOfiV2NFT is IERC721 {
    event PreMint(uint256 amount);

    function mint(address to, uint256 tokenId) external;
    function preMint(uint256 count) external;
}
