pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Presale is Crowdsale, Ownable {

    event Finalized();

    using SafeMath for uint256;

    struct WhitelistData {
        bool whitelisted;
        // basic token units / wei
        uint rate;
        uint lockupDuration;
    }

    uint256 public totalTokenSold;

    uint256 public openingTime;
    uint256 public closingTime;

    mapping(address => WhitelistData) public whitelist;
    mapping(address => uint256) public balances;

    /**
     * @dev Constructor, takes crowdsale opening and closing times.
     * @param _openingTime Crowdsale opening time
     * @param _closingTime Crowdsale closing time
     */
    constructor(address _wallet, ERC20 _token, uint256 _openingTime, uint256 _closingTime) Crowdsale(1, _wallet, _token) Ownable() public {
        // solium-disable-next-line security/no-block-members
        require(_openingTime >= block.timestamp);
        require(_closingTime >= _openingTime);

        openingTime = _openingTime;
        closingTime = _closingTime;
    }

    /**
     * @dev Reverts if beneficiary is not whitelisted. Can be used when extending this contract.
     */
    modifier isWhitelisted(address _beneficiary) {
        require(whitelist[_beneficiary].whitelisted);
        _;
    }

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        // solium-disable-next-line security/no-block-members
        require(block.timestamp >= openingTime && block.timestamp <= closingTime);
        _;
    }

    /**
     * @dev Checks whether the period in which the crowdsale is open has already elapsed.
     * @return Whether crowdsale period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp > closingTime;
    }

    /**
     * @dev Adds single address to whitelist.
     * @param beneficiary Address to be added to the whitelist
     */
    function addToWhitelist(address beneficiary, uint rate, uint lockupDuration) public onlyOwner {
        WhitelistData storage data = whitelist[beneficiary];
        data.whitelisted = true;
        data.rate = rate;
        data.lockupDuration = lockupDuration;
    }

    /**
     * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing.
     * @param beneficiaries Addresses to be added to the whitelist
     */
    function addManyToWhitelist(address[] beneficiaries, uint[] rate, uint[] lockupDuration) external onlyOwner {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            addToWhitelist(beneficiaries[i], rate[i], lockupDuration[i]);
        }
    }

    /**
     * @dev Removes single address from whitelist.
     * @param _beneficiary Address to be removed to the whitelist
     */
    function removeFromWhitelist(address _beneficiary) external onlyOwner {
        whitelist[_beneficiary].whitelisted = false;
    }

    // Set the closingTime to now and close the sale
    function finalize() external onlyOwner {
        closingTime = now;
        emit Finalized();
    }

    // Set the closingTime to now and close the sale
    function setOpeningAndClosingTime(uint256 _openingTime, uint256 _closingTime) external onlyOwner {
      openingTime = _openingTime;
      closingTime = _closingTime;
    }

    // transfer out tokens
    function transferTokens(address beneficiary, uint amount) external onlyOwner {
        require(amount <= token.balanceOf(address(this)));
        require(token.transfer(beneficiary, amount));
    }

    /**
     * @dev Withdraw tokens only after crowdsale ends.
     */
    function withdrawTokens() public {
        require(hasClosed());
        require(whitelist[msg.sender].whitelisted);
        require(closingTime.add(whitelist[msg.sender].lockupDuration) < now);
        uint256 amount = balances[msg.sender];
        require(amount > 0);
        balances[msg.sender] = 0;
        _deliverTokens(msg.sender, amount);
    }

    function buyTokens(address _beneficiary) public payable {

        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(_beneficiary, weiAmount);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        _processPurchase(_beneficiary, tokens);
        emit TokenPurchase(
                           msg.sender,
                           _beneficiary,
                           weiAmount,
                           tokens
                           );

        _updatePurchasingState(_beneficiary, weiAmount);

        _forwardFunds();
        _postValidatePurchase(_beneficiary, weiAmount);
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(address _beneficiary, uint256 _weiAmount)
        internal view returns (uint256)
    {
        return _weiAmount.mul(whitelist[_beneficiary].rate);
    }

    /**
     * @dev Overrides parent by storing balances instead of issuing tokens right away.
     * @param _beneficiary Token purchaser
     * @param _tokenAmount Amount of tokens purchased
     */
    function _processPurchase(
                              address _beneficiary,
                              uint256 _tokenAmount
                              )
        internal
    {
        balances[_beneficiary] = balances[_beneficiary].add(_tokenAmount);
        totalTokenSold = totalTokenSold.add(_tokenAmount);
    }

    /**
     * @dev Extend parent behavior requiring beneficiary to be in whitelist.
     * @param _beneficiary Token beneficiary
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(
                                  address _beneficiary,
                                  uint256 _weiAmount
                                  )
        internal
        isWhitelisted(_beneficiary)
        onlyWhileOpen()
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }
}
