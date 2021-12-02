import React, {useState, useEffect, useRef} from 'react';``
import Box from "@mui/material/Box";
import CircularProgress from '@mui/material/CircularProgress';

import WalletConnectProvider from "@walletconnect/web3-provider";
const Web3 = require('web3');
const infuraConfig = require('../../private/infura.config.js');
let testUrl = infuraConfig.infuraUrl;

import SwitchAndConnectButton from '../../lib/switchConnectButton.js';
import ErrorHandler from './ErrorHandler.js';
import walletConnect, {isConnected} from '../../lib/connect.serv.js';

export default function Provider(props) {
  const [initProvider] = useState('init');
  const [providerInstance, setProviderInstance] = useState(null);
  const [query, setQuery] = useState({status: 'init'});
  const [error, setError] = useState({status: null, code: null});

  const providerInstanceRef = useRef(providerInstance);
  const claimAddressRef = useRef(props.claimAddress);
  const queryRef = useRef(query);

  useEffect(() => {
    providerInstanceRef.current = providerInstance;
  }, [providerInstance]);

  useEffect(() => {
    claimAddressRef.current = props.claimAddress;
  }, [props.claimAddress]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  let queryConnectionErrors = [4001,311,312,-32002,313].join(":");
  let connectionErrorsTimeout = [4001,311,-32002,313].join(":");

  useEffect(() => {
    if (props.query.status == 'disconnect') { 
      disconnect();
    } else {
      let getCurrentConnection = isConnected(props.claimAddress);
      getCurrentConnection.then((res) => {
        if (res) {
          success(res);
        }
      }).catch((err) => {
        errorInit(err);
      });
    }
  }, [initProvider]);
  
  const connectForClaim = async (providerName) => {
    // Provider {
    //     "MM" for METAMASK
    //     "WC" for WalletConnect
    // }

    setQuery({status: 'loading-connect'});

    let conAddr;

    if (!providerInstanceRef.current && providerName == "MM"){
      // user is not connected yet
      const web3 = new Web3(Web3.givenProvider || testUrl);
      conAddr = walletConnect(providerName, web3, claimAddressRef.current);
    } else if (!providerInstanceRef.current && providerName == "WC"){
      const Wc3 = new WalletConnectProvider({
        infuraId: infuraConfig.infuraId,
        rpc: {
          1: infuraConfig.infuraUrl,
          122: infuraConfig.pocketUrl,
        },
      });
      const web3wc = new Web3(Wc3);
      // TODO: If user closes modal from the dapp, a proper error is returned
      //       If user declines the connection from wallet, nothing returns, 
      //       and below promise return stays pending
      conAddr = walletConnect(providerName, web3wc, claimAddressRef.current);
    }

    conAddr.then((res) => {
      setProviderInstance(res.providerInstance);
      success(res);
    }).catch((err) => {
      errorInit(err);
    });
  }

  const wrongNetwork = (res) => {
    if (query.status !== 'success') {
      success(res);
    };
  }

  const disconnect = () => {
    setProviderInstance(null);
    setTimeout(() => {
      setQuery({status: 'error'});
      setError({status: props.query.status, code: props.query.code});
    }, 1);

    if (connectionErrorsTimeout.indexOf(props.query.code) !== -1) {
      setTimeout(() => {
        setQuery({action: 'idle', code: null});
        setError({status: null, code: null});
      }, 2500);
    }
  }

  const wrongAddress = (res) => {
    setProviderInstance(res.providerInstance);
    if (res.providerName == "MM"){
      res.providerInstance.currentProvider.on('accountsChanged', (res) => {
        providerInstanceRef.current.currentProvider.removeAllListeners();
        disconnect();
      });
    } else {
      res.providerInstance.on("disconnect", (code, res) =>{
        providerInstanceRef.current.removeAllListeners();
        disconnect();
      });
    }
  }

  const errorInit = (err) => {
    // console.log('catch"m -->', err);
    err.code == 310 ? 
      wrongNetwork(err.res) 
    :
    err.code == 312 ?
      wrongAddress(err.res)
    :
      err.message == 'User closed modal' ? err.code = 311 : null;
      setQuery({status: 'error'});
      setError({status: '', code: err.code});
      if (connectionErrorsTimeout.indexOf(err.code) !== -1) {
        setTimeout(() => {
          setQuery({action: 'idle', code: null});
          setError({status: null, code: null});
        }, 2500);
      }
  }

  /* 
   * setConnection returns User to ClaimDialog and Provider gets unmounted 
   */
  const success = (res) => {
    setQuery({status: 'success'});
    props.setConnection(res); 
  }

  return (
    query.status === 'loading-connect' ? 
      <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> 
    :   
    queryConnectionErrors.indexOf(error.code) !== -1 && queryRef.current.status == 'error' ?
      <ErrorHandler action={error}/> 
    :
    <Box sx={{
      marginTop: "20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <SwitchAndConnectButton
        fullWidth
        variant="contained"
        sx={{
            backgroundImage: `url('/metamask.svg')`, 
            marginRight: "40px"
        }}
        onClick={() => connectForClaim("MM")}></SwitchAndConnectButton>
      <SwitchAndConnectButton
        fullWidth
        variant="contained"
        sx={{
            backgroundImage: `url('/walletconnect.svg')`, 
        }}
        onClick={() => connectForClaim("WC")}></SwitchAndConnectButton>
    </Box>
  )
}