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
      // after connected address is set, switch component is loaded
      setConnectedAddress(res.connectedAddress);
    }
  }

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