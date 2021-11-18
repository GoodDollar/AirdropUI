import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect, useRef} from 'react';

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

  useEffect(() => {
    if (props.currentConnection){
      setProviderInstance(props.currentConnection.providerInstance);
      setConnectedAddress(props.currentConnection.connectedAddress);
      setChainId(props.currentConnection.chainId);
      setConnectedProvider(props.currentConnection.providerName);
      if (props.currentConnection.connectedChain == 'unsupported'){
        wrongNetwork();
      } else {
        setQuery({status: null});
        setError({status: null, code: null});
        setConnectedChain(props.currentConnection.connectedChain);
      }
    }
  }, [props]);


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