import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import React, { useState, useEffect} from 'react';

import Provider from './provider.js';
import Claim from './claim.js';

export default function ClaimDialog(props) {
  const [claimAddress, setClaimAddress] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [initClaim] = useState('init');
  const {onClose, open} = props;
  const [query, setQuery] = useState({status: 'init'});
  const [gRep, setGRep] = useState(null);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [providerEvents, setProviderEvents] = useState({status: null});

  useEffect(() => {
    let gRep = props.proofData.reputationInWei / 1e18;
    setGRep(gRep);
    setClaimAddress(props.proofData.addr);
  }, [initClaim]);

  const handleClose = () => {
    onClose();
  }

  const connectionHandler = (res) => {
    console.log("change address now -->", res);
    if (res.status == 'error'){
      // TODO: Not showing disconnect message properly yet
      setCurrentConnection(null);
      setQuery(res);
      setConnectedAddress(null);
    } else {
      setCurrentConnection(res);
      setQuery({status: 'connected'});
      setProviderEvents({status: 'init'});
      // after connected address is set, switch component is loaded
      setConnectedAddress(res.connectedAddress);
    }
  }

  useEffect(() => {
    if (providerEvents.status == 'init') {
      if (currentConnection.providerName == "MM") {
        let supportedChains = ['0x7a', '0x1', 1, 122].join(':');

        // TODO: Either window reload or a state property so that the event doesn't have multiple instances
        currentConnection.providerInstance.currentProvider.on('chainChanged', (chainId) => {
          if (supportedChains.indexOf(chainId) !== -1) {
            const updateConnection = {
              providerName: currentConnection.providerName,
              connectedAddress: currentConnection.connectedAddress,
              connectedChain: (chainId == "0x7a" ? "Fuse": "Ethereum Mainnet"),
              chainId: (chainId == "0x7a" ? 122 : 1),
              providerInstance: currentConnection.providerInstance
            }
            setCurrentConnection(updateConnection);
            setConnectedAddress(currentConnection.connectedAddress);
          } else {
            const updateConnection = {
              providerName: currentConnection.providerName,
              connectedAddress: currentConnection.connectedAddress,
              connectedChain: 'unsupported',
              chainId: '0x00',
              providerInstance: currentConnection.providerInstance
            }
            setCurrentConnection(updateConnection);
            setConnectedAddress(currentConnection.connectedAddress);
          }
        });
        // TODO: Handle connection of multiple accounts
        currentConnection.providerInstance.currentProvider.on('accountsChanged', (res) => {
          currentConnection.providerInstance.currentProvider.removeAllListeners();
          if (res.length === 0) {
            let status = {status: 'disconnect', code: 313};
            setQuery(status);
            setCurrentConnection(null);
            setConnectedAddress(null);
          }
        });
      } else {
        currentConnection.providerInstance.on("accountsChanged", (accounts) => {
          // runs on every connection through the WC provider
          console.log('wc accounts changed --> accounts -->', accounts);
        });

        // provInstanceRef.on("connect", () => {
        //   // after clicking connect button in wallet
        //   console.log('wc connect');
        // });

        currentConnection.providerInstance.on("chainChanged", (chainId) => {
          console.log("wc chainChanged");
          // do stuff
        })

        currentConnection.providerInstance.on("disconnect", (code, res) =>{
          // code 1000 == disconnect
          currentConnection.providerInstance.removeAllListeners();
          let status = {status: 'disconnect', code: 313};
          setQuery(status);
          setCurrentConnection(null);
          setConnectedAddress(null);
        });
      }
    }
  }, [providerEvents]);

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogContent 
        className="dialogContentContainer" 
        sx={{
          width: "500px",
          height: "max-content",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
        <DialogTitle>You have {gRep} GOOD Tokens to claim!</DialogTitle>
        <Typography variant="span"> 
          Connect your wallet below. 
          Make sure to connect with your eligible address which is:
        </Typography>
        <Typography variant="span" sx={{fontWeight: "bold", fontStyle: "italic"}}>
          {claimAddress}
        </Typography>
        { !connectedAddress ?
          <Provider claimAddress={claimAddress} 
                    setConnection={connectionHandler}
                    query={query} />
          :
          <Claim proofData={props.proofData} currentConnection={currentConnection} 
                  setConnection={connectionHandler} />
        }
      </DialogContent>
    </Dialog>
  )
}