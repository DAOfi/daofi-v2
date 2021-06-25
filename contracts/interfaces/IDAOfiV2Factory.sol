// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IDAOfiV2Factory {
    event PairCreated(
        address indexed _pair,
        string _name,
        string _symbol,
        address _pairOwner,
        uint _pairCount
    );
    function getPair(address _owner, string memory _symbol) external view returns (address _pair);
    function allPairs(uint) external view returns (address _pair);
    function allPairsLength() external view returns (uint);
    function createPair(
        address _nftAddress,
        uint256 _initX,
        uint32 _m,
        uint32 _n,
        uint32 _ownerFee
    ) external returns (address pair);
}
