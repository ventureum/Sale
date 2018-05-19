pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract Token is StandardToken {
    constructor(address[] initialAccountSet, uint256 initialBalance) public {
        for (uint i = 0; i < initialAccountSet.length; i++) {
            balances[initialAccountSet[i]] = initialBalance;
        }
        totalSupply_ = initialAccountSet.length * initialBalance;
    }
}
