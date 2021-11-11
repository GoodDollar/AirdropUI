

export default function providerInit2(providerName, provInstance){
  let status, errorInit, queryInit, connectedChainInit, chainIdInit;
  console.log('providerName init -->', providerName);
  if (!providerName){
    status = 'new';
    return {status};
  } else if (providerName == "MM") {
    let supportedChains = ['0x7a', '0x1', 1, 122].join(':');
    // Docs state that a window reload is recommended?
    provInstance.eth.currentProvider.on('chainChanged', (chainId) => {
      if (supportedChains.indexOf(chainId) !== -1) {
        status = 'changed';
        errorInit = null;
        queryInit = 'idle';
        connectedChainInit = (chainId == "0x7a" ? "Fuse": "Ethereum Mainnet");
        chainIdInit = (chainId == "0x7a" ? 122 : 1);

        return {status, errorInit, queryInit, connectedChainInit, chainIdInit};
        // setError(null);
        // setQuery('idle');
        // setConnectedChain(chainId == "0x7a" ? "Fuse": "Ethereum Mainnet");
        // setChainId(c);
      } else {
        // let res = {
        //   connectedChain: connectedChainRef.current,
        //   chainId: chainId,
        //   connectedAddress: connectedAddressRef.current,
        // };
        // wrongNetwork(res, providerName);
      }
    });

    // TODO: Handle connection of multiple accounts
    provInstance.eth.currentProvider.on('accountsChanged', (res) => {
      if (res.length === 0) {
        disconnect();
      }
    });

    status = 'initialized';
    return {status, provInstance};
  } else {
    provInstance.on("accountsChanged", (accounts) => {
      // runs on every connection through the WC provider
      console.log('wc accounts changed --> accounts -->', accounts);
    });

    provInstance.on("connect", () => {
      // after clicking connect button in wallet
      console.log('wc connect');
    });

    provInstance.on("chainChanged", (chainId) => {
      console.log("wc chainChanged");
      // do stuff
    })

    provInstance.on("disconnect", (code, res) =>{
      // code 1000 == disconnect
      disconnect();
    });
  }
}