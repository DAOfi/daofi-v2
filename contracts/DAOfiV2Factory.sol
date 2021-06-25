// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import './interfaces/IDAOfiV2Factory.sol';
import "./interfaces/IDAOfiV2NFT.sol";
import './DAOfiV2Pair.sol';

contract DAOfiV2Factory is IDAOfiV2Factory {
    mapping(address => mapping(string => address)) public override getPair;
    address[] public override allPairs;

    constructor() {
    }

    /**
    * @dev Get the total number of pairs created
    *
    * @return uint number of pairs
    */
    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function createPair(
        address _nftAddress,
        uint256 _initX,
        uint32 _m,
        uint32 _n,
        uint32 _ownerFee
    ) external override returns (address _pair) {
        address owner = IDAOfiV2NFT(_nftAddress).ownerAddress();
        string memory name = IERC721Metadata(_nftAddress).name();
        string memory symbol = IERC721Metadata(_nftAddress).symbol();
        require(getPair[owner][symbol] == address(0), 'PAIR_EXISTS');
        _pair = address(new DAOfiV2Pair(
            _nftAddress,
            _initX,
            _m,
            _n,
            _ownerFee
        ));
        getPair[owner][symbol] = _pair;
        allPairs.push(_pair);
        emit PairCreated(
            _pair,
            name,
            symbol,
            owner,
            allPairs.length
        );
    }
}
