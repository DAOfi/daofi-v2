// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import './interfaces/IDAOfiV2Factory.sol';
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
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        address _proxyAddress,
        address payable _pairOwner,
        uint256 _preMint,
        uint256 _nftReserve,
        uint256 _initX,
        uint32 _m,
        uint32 _n,
        uint32 _ownerFee
    ) external override returns (address _pair) {
        require(getPair[_pairOwner][_symbol] == address(0), 'PAIR_EXISTS');
        _pair = address(new DAOfiV2Pair(
            _name,
            _symbol,
            _baseTokenURI,
            _proxyAddress,
            _pairOwner,
            _nftReserve,
            _initX,
            _m,
            _n,
            _ownerFee
        ));
        for (uint256 i = 0; i < _preMint; i++) {
            DAOfiV2Pair(_pair).preMint();
        }
        getPair[_pairOwner][_symbol] = _pair;
        allPairs.push(_pair);
        emit PairCreated(
            _pair,
            _name,
            _symbol,
            _pairOwner,
            allPairs.length
        );
    }
}
