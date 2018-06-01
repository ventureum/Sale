pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract Presale is Crowdsale, Pausable {


    using SafeMath for uint256;

    event _Finalized();
    event _NewWhiteListee(
        address indexed msgSender,
        address indexed beneficiary, 
        uint rate, 
        uint lockupDuration
    );
    event _WhiteListeeRemoved(
        address indexed msgSender,
        address indexed beneficiary
    );

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
     * @dev Constructor, takes crowdsale opening and closing times
     * @param _wallet Address where funds are collected
     * @param _token The token being sold
     * @param _openingTime Crowdsale opening time
     * @param _closingTime Crowdsale closing time
     */
    constructor(
        address _wallet, 
        ERC20 _token, 
        uint256 _openingTime, 
        uint256 _closingTime
    )
        public 
        Crowdsale(1, _wallet, _token) 
        Ownable() 
        
    {
        // solium-disable-next-line security/no-block-members
        require(_openingTime >= block.timestamp);
        require(_closingTime >= _openingTime);

        openingTime = _openingTime;
        closingTime = _closingTime;
    }

    /**
     * @dev Reverts if beneficiary is not whitelisted. Can be used when extending this contract.
     * @param beneficiary the address being checked 
     */
    modifier isWhitelisted(address beneficiary) {
        require(whitelist[beneficiary].whitelisted);
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
     * @notice This function adds a single address to whitelist.
     * @param beneficiary Address to be whitelisted
     * @param rate The rate to be used at time of purchase for the beneficiary
     * @param lockupDuration The amount of blocks the beneficiary 
     *  needs to wait before tokens can be withdrawn
     */
    function addToWhitelist(
        address beneficiary, 
        uint rate, 
        uint lockupDuration
    )
        public 
        onlyOwner 
        whenNotPaused 
    {
        WhitelistData storage data = whitelist[beneficiary];
        data.whitelisted = true;
        data.rate = rate;
        data.lockupDuration = lockupDuration;

        emit _NewWhiteListee(msg.sender, beneficiary, rate, lockupDuration);
    }

    /**
     * @notice This function adds a list of addresses to whitelist
     * @param beneficiaries Addresses to be whitelisted
     * @param rate The rate to be used at time of purchase for the beneficiary
     * @param lockupDuration The amount of blocks the beneficiary 
     *  needs to wait before tokens can be withdrawn
     */
    function addManyToWhitelist(
        address[] beneficiaries, 
        uint[] rate, 
        uint[] lockupDuration
    ) 
        external 
        onlyOwner 
        whenNotPaused 
    {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            addToWhitelist(beneficiaries[i], rate[i], lockupDuration[i]);

            emit _NewWhiteListee(msg.sender, beneficiaries[i], rate[i], lockupDuration[i]);
        }
    }

    /**
     * @dev Removes single address from whitelist
     * @param beneficiary Address to be removed from the whitelist
     */
    function removeFromWhitelist(address beneficiary) external onlyOwner whenNotPaused {
        delete whitelist[beneficiary];

        emit _WhiteListeeRemoved(msg.sender, beneficiary);
    }

    // Set the closingTime to block.timestamp and close the sale
    function finalize() external onlyOwner whenNotPaused {

        /* solium-disable-next-line security/no-block-members */
        closingTime = block.timestamp;

        emit _Finalized();
    }

    /*
     * @notic Set the closingTime to block.timestamp and close the sale
     * @dev can only be called by owner and while not paused
     * @param _openingTime block number that the sale starts
     * @param _closingTime block number that the sale ends
     */
    function setOpeningAndClosingTime(
        uint256 _openingTime, 
        uint256 _closingTime
    ) 
        external 
        onlyOwner 
        whenNotPaused 
    {
        openingTime = _openingTime;
        closingTime = _closingTime;
    }

    /* @notice transfer out tokens
     * @param beneficiary the address of beneficiary
     * @param amount the amount of token to be transftered
     */
    function transferTokens(address beneficiary, uint amount) external onlyOwner whenNotPaused {
        require(amount <= token.balanceOf(address(this)));
        require(token.transfer(beneficiary, amount));
    }

    /**
     * @dev Withdraw tokens only after crowdsale ends.
     */
    function withdrawTokens() public whenNotPaused {
        require(hasClosed());
        require(whitelist[msg.sender].whitelisted);

        /* solium-disable-next-line security/no-block-members */
        require(closingTime.add(whitelist[msg.sender].lockupDuration) < block.timestamp);

        uint256 amount = balances[msg.sender];
        require(amount > 0);
        balances[msg.sender] = 0;
        _deliverTokens(msg.sender, amount);
    }

    /**
     * @notice buy tokens for beneficiary
     * @dev low level token purchase 
     * @param beneficiary Address performing the token purchase
     */
    function buyTokens(address beneficiary) public payable onlyWhileOpen whenNotPaused {

        uint256 weiAmount = msg.value;
        _preValidatePurchase(beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(beneficiary, weiAmount);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        _processPurchase(beneficiary, tokens);
        emit TokenPurchase(
            msg.sender,
            beneficiary,
            weiAmount,
            tokens
        );

        _updatePurchasingState(beneficiary, weiAmount);

        _forwardFunds();
        _postValidatePurchase(beneficiary, weiAmount);
    }

    /*
     * @notice Purchase token for msg.sender itself
     * @dev This function is to accomodate front-end implmentation
     */
    function purchaseToken() external payable onlyWhileOpen whenNotPaused {
        buyTokens(msg.sender);
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param beneficiary The address of the beneficiary
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified weiAmount
     */
    function _getTokenAmount(
        address beneficiary, 
        uint256 weiAmount
    )
        internal 
        view 
        returns (uint256)
    {
        return weiAmount.mul(whitelist[beneficiary].rate);
    }

    /**
     * @dev Overrides parent by storing balances instead of issuing tokens right away.
     * @param beneficiary Token purchaser
     * @param tokenAmount Amount of tokens purchased
     */
    function _processPurchase(
        address beneficiary,
        uint256 tokenAmount
       )
        internal
        whenNotPaused
    {
        balances[beneficiary] = balances[beneficiary].add(tokenAmount);
        totalTokenSold = totalTokenSold.add(tokenAmount);
    }

    /**
     * @dev Extend parent behavior requiring beneficiary to be in whitelist.
     * @param beneficiary Token beneficiary
     * @param weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(
        address beneficiary,
        uint256 weiAmount
    )
        internal
        isWhitelisted(beneficiary)
        onlyWhileOpen()
    {
        super._preValidatePurchase(beneficiary, weiAmount);
    }
}
