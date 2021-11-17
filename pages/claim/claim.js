import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect, useCallback, useRef} from 'react';

import SwitchAndConnectButton from '../../lib/switchConnectButton.js';
import ErrorHandler from './ErrorHandler.js';

export default function Claim(props) {
  const [providerInstance, setProviderInstance] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [connectedChain, setConnectedChain] = useState(null);
  const [connectedProvider, setConnectedProvider] = useState(null);
  const [chainId, setChainId] = useState(null);

  const [query, setQuery] = useState({status: null});
  const [error, setError] = useState({status: null, code: null});
  const [initProvider] = useState('init');

  const connectedAddressRef = useRef(connectedAddress);
  const connectedChainRef = useRef(connectedChain);
  const chainIdRef = useRef(chainId);

  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  useEffect(() => {
    connectedAddressRef.current = connectedAddress;
  }, [connectedAddress]);

  useEffect(() => {
    connectedChainRef.current = connectedChain;
  }, [connectedChain]);
   
  // Chain changed triggered both through app-button and manual through wallet
  const providerInit = useCallback((providerName, provInstanceRef) => {
    console.log("setting provider events");
    if (providerName == "MM") {
      let supportedChains = ['0x7a', '0x1', 1, 122].join(':');
          console.log('provider.js -- provInstanceRef -->', provInstanceRef);
      // TODO: Either window reload or a state property so that the event doesn't have multiple instances
      provInstanceRef.eth.currentProvider.on('chainChanged', (chainId) => {
        console.log("chain changed meta");
        if (supportedChains.indexOf(chainId) !== -1) {
          setConnectedChain(chainId == "0x7a" ? "Fuse": "Ethereum Mainnet");
          setChainId(chainId == "0x7a" ? 122 : 1);
          setError({status: '', code: null});
          setQuery({status: 'idle'});
        } else {
          setChainId(chainId);
          let res = {
            connectedChain: connectedChainRef.current,
            chainId: chainIdRef.current,
            connectedAddress: connectedAddressRef.current,
          };
          wrongNetwork(res);
        }
      });
      // TODO: Handle connection of multiple accounts
      provInstanceRef.eth.currentProvider.on('accountsChanged', (res) => {
        if (res.length === 0) {
          clearState();
        }
      });
    } else {
      provInstanceRef.on("accountsChanged", (accounts) => {
        // runs on every connection through the WC provider
        console.log('wc accounts changed --> accounts -->', accounts);
      });

      // provInstanceRef.on("connect", () => {
      //   // after clicking connect button in wallet
      //   console.log('wc connect');
      // });

      provInstanceRef.on("chainChanged", (chainId) => {
        console.log("wc chainChanged");
        // do stuff
      })

      provInstanceRef.on("disconnect", (code, res) =>{
        // code 1000 == disconnect
        clearState();
      });
    }
  }, [initProvider]);

  useEffect(() => {
    console.log('setting state switch . . . -->', props);
    setProviderInstance(props.currentConnection.providerInstance);
    setConnectedAddress(props.currentConnection.connectedAddress);
    setChainId(props.currentConnection.chainId);
    setConnectedProvider(props.currentConnection.providerName);
    providerInit(props.currentConnection.providerName, 
                 props.currentConnection.providerInstance);

    if (props.currentConnection.connectedChain == 'unsupported'){
      wrongNetwork();
    } else {
      setConnectedChain(props.currentConnection.connectedChain);
    }
  }, [providerInit]);


  const addFuseNetwork = async(id) => {
    setQuery({status: "loading-connect", code: null});
    providerInstance.eth.currentProvider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: id,
        chainName: 'Fuse Mainnet',
        nativeCurrency: {
          name: 'Fuse',
          symbol: 'FUSE',
          decimals: 18
        },
          rpcUrls: ['https://rpc.fuse.io'],
          blockExplorerUrls: ['https://explorer.fuse.io']
        }],
    }).catch((err) => {
        setQuery({status: 'error'});
        setError({status: '', code: err.code});
    });
  }

  // Switching of network by button
  const switchNetwork = async (chainId) => {
    if (connectedProvider !== "WC"){
      providerInstance.eth.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId}]
      }).catch((err) => {
        if (err.code == 4902){
          addFuseNetwork(chainId);
        } else {
          setError({status: null, code: err.code});
        }
      });
    }  
  }

  const wrongNetwork = (res) => {
    setError({status: 'wrongNetwork', code: 310});
    setQuery({status: 'error'});
    setConnectedChain('unsupported');
    setChainId('0x00');
  }
    
  const clearState = () => {
    // When connecting through ineligible address, message doesn't update
    setError({status: 'error', code: 313});
    setQuery({status: 'error'});
    setConnectedAddress(null);
    setConnectedProvider(null);
    setConnectedChain(null);
    setProviderInstance(null);
    setChainId(null);
    let status = {status: 'error', code: 313};
    props.setConnection(status);
    // setTimeout(() => {      
    //   setQuery({status: 'idle'});
    //   setError({status: null, code: null});
    // }, 2500);
  }

  // Where to get the abi for the new contract?
  const getReputation = async(chainId) => {
    const claim = claimReputation("abiHere", 
                                  props.proofData, 
                                  connectedProvider, 
                                  chainId.chainId);
  }

  return (
    <div>
      <div>You are currently connected with address:</div>
      <Typography variant="span" sx={{fontStyle: "italic", fontWeight: "bold"}}>
        {connectedAddress} 
      </Typography>
      <div>----------------------</div>
     <div>On network: 
      <Typography variant="span" 
                  style={{fontWeight: "bold"}}>
          {connectedChain}            
      </Typography>
      </div>
      <Box>   
        <Typography variant="span">
          Make sure you are connected to the network for which 
          you want to claim (Blue): 
        </Typography>
        <br />                         
        <SwitchAndConnectButton
          fullWidth
          variant="contained"
          className={`${chainId == 1 ? "chain-connected" : ""}`}
          sx={{
            mt: 3,
            mb: 2,
            backgroundImage: `url('/ethereum.svg')`,
          }}
          onClick={() => switchNetwork("0x1")}></SwitchAndConnectButton>

        {connectedProvider === "WC" ? null :
        <SwitchAndConnectButton
          fullWidth
          variant="contained"
          className={`${chainId == 122 ? "chain-connected" : ""}`}
          sx={{
            mt: 3,
            mb: 2,
            backgroundImage: `url('/fuse.svg')`
          }}
          onClick={() => switchNetwork("0x7a")}></SwitchAndConnectButton>
        }
      </Box>
      {
        query.status === 'error' && error.status === "wrongNetwork" ? 
          <ErrorHandler action={error}/>
        :
        <Box>
          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 3, 
              mb: 2, 
              backgroundColor: "#00C3AE", 
                '&:hover': {
                  backgroundColor: "#049484"
            }}}
            onClick={() => getReputation({chainId})}>
              Claim your tokens
          </Button>
      </Box>
      }
    </div>
  )
}