pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';


/**
 * @title Presale
 * @dev Pre-sale is a base contract for managing a token pre-sale,
 * allowing investors to purchase tokens with ether.
 * On the basic of Crowdsale, Pre-sale offer three fatures:
 * 1. Only validated address can purchase
 * 2. Set price for each purchaser
 * 3. Set lockup duration for each purchaser
 */
contract Presale is Crowdsale, Ownable {

    mapping (address => State) internal states;
    struct State {
        bool validated;
        uint256 price;
        uint256 lockupTime;
    }

    uint256 public startTime;

    /**
     * @param _wallet Address where collected funds will be forwarded to
     * @param _token Address of the token being sold
     * @param _startTime The start time for lockup
     */
    constructor (
        address _wallet, 
        ERC20 _token, 
        uint256 _startTime
    ) 
    public 
    {
        require(_wallet != address(0));
        require(_token != address(0));

        wallet = _wallet;
        startTime = _startTime;
        token = _token;
    }


    /**
     * @dev Executed when master want add/change a purchaser's state.
     * @param _purchaserAddresses The address that master want add/change.
     * @param _prices How many token units a buyer gets per wei
     * @param _lockupTimes The duration time; lockup duration is [startTime, startTime + lockupTime].
     */
    function addPurchasers (
        address[] _purchaserAddresses,
        uint256[] _prices,
        uint256[] _lockupTimes
    ) external onlyOwner {
        for (uint i = 0; i < _purchaserAddresses.length; i++) {
            State memory state = State({
                validated : true,
                price : _prices[i],
                lockupTime : _lockupTimes[i]
            });
            states[_purchaserAddresses[i]] = state;
        }
    }

    /**
    * @param _purchaserAddress The purchaser address user want to get state.
    * returns the validated, price, lockupTime.
        */
    function getState (address _purchaserAddress) public view returns (bool, uint256, uint256) {
        require (stateExist(_purchaserAddress));

        State storage state = states[_purchaserAddress];
        return (state.validated, state.price, state.lockupTime);

    }

    /**
    * @param _purchaserAddress The purchaser address user want to check.
    * returns true if this state exist, false otherwise.
            */
    function stateExist(address _purchaserAddress) public view returns (bool) {
        return states[_purchaserAddress].price > 0;
    }


    /**
    * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met. Use super to concatenate validations.
    * @param _beneficiary Address performing the token purchase 
    * @param _weiAmount Value in wei involved in the purchase
    */
    function _preValidatePurchase (
        address _beneficiary,
        uint256 _weiAmount
    )
    internal
    {
        require(_beneficiary != address(0));
        require(_weiAmount != 0);
        require(states[msg.sender].validated);
        require(states[msg.sender].price != 0);
        require(states[msg.sender].lockupTime + startTime < now);
    }

    /**
    * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid conditions are not met.
    * @param _beneficiary Address performing the token purchase
    * @param _weiAmount Value in wei involved in the purchase
    */
    function _postValidatePurchase (
        address _beneficiary,
        uint256 _weiAmount
    )
    internal
    {
        // optional override
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount (uint256 _weiAmount)
    internal view returns (uint256)
    {
        return _weiAmount.mul(states[msg.sender].price);
    }

    /**
    * @dev Determines how ETH is stored/forwarded on purchases.
    */
    function _forwardFunds() internal {
        wallet.transfer(msg.value);
    }
}
