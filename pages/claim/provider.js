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
    console.log("provider props -->", props);
    if (props.query.status == 'error') { 
      disconnect();
    } else {
      let getCurrentConnection = isConnected(props.claimAddress);
      getCurrentConnection.then((res) => {
        console.log('res -->', res);
        if (res) {
          success(res);
        }
      });
    }
  }, [initProvider]);



  const disconnect = () => {
    console.log("disconnecting . . .");
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
      // providerInit(providerName, web3);
      conAddr = walletConnect(providerName, web3, claimAddressRef.current);
    // } else if (providerInstanceRef.current && providerName == "MM") {
    //   // user has exisiting MetaMask connection(s)
    //   conAddr = walletConnect(providerName, providerInstanceRef.current, claimAddressRef.current);
    } else {
      console.log('wallet connect attempt connect for claim');
      const Wc3 = new WalletConnectProvider({
        infuraId: infuraConfig.infuraId
      });
      setProviderInstance(Wc3);
      // providerInit(providerName, Wc3);
      // TODO: If user closes modal from the dapp, a proper error is returned
      //       If user declines the connection from wallet, nothing returns, 
      //       and below promise return stays pending
      conAddr = walletConnect(providerName, Wc3);
    }

    conAddr.then((res) => {
      // Temp for testing wallet-connect
      // if (res.connectedAddress !== claimAddressRef.current){
        console.log('successfully connected');
        success(res);
      // } 
    }).catch((err) => {
      console.log('catch"m -->', err.code);
      err.code == 310 ? 
      // TODO: doesnt work properly for initializing events after
        wrongNetwork(err.res) 
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
    });
  }

  const wrongNetwork = (res) => {
    //TODO: doesn't show error when already connected to the wrong network
    // If wallet already connected, set connected state
    console.log('wrong network provider res -->', res);
    if (query.status !== 'success') {
      success(res);
    };
  }


  const success = (res) => {
    setQuery({status: 'success'});
    console.log('props after success -->',props);
    props.setConnection(res);
    // bubble back to parent --> claim
  }

  return (
    query.status === 'loading-connect' ? 
      <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> 
    :   
    queryConnectionErrors.indexOf(error.code) !== -1 && queryRef.current.status == 'error' ?
      <ErrorHandler action={error}/> 
    :
    // props.query.status == 'error' ?
    //   <ErrorHandler action={error}/>
    // :
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