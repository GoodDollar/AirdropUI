import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect} from 'react';
import Container from "@mui/material/Container";
import CircularProgress from '@mui/material/CircularProgress';
import {setNewRecipient, claimReputation, getRecipient, getPendingTXStatus} from '../../lib/connect.serv.js';

export default function Claim(props){
  const [proof, setProof] = useState(null);
  const [connectionDetails, setConnectionDetails] = 
        useState({connectedChain: null, connectedAddress: null});
  const [query, setQuery] = useState({status: 'init'});
  const [repRecipient, setRepRecipient] = useState(null);
  const [contractInstance, setContractInstance] = useState(null);

  useEffect(() => {
    setProof(props.proofData);
    getRec(props.currentConnection);
    setConnectionDetails(props.currentConnection);
  }, [props]);

  const changeRecipient = async(e) => {
    let newRecipient = e.target[0].value;
    e.preventDefault();
    setQuery({status: 'pending'});
    const newRecipientSet = setNewRecipient(contractInstance, 
                                            connectionDetails, 
                                            newRecipient);    
    newRecipientSet.then((res) => {
      if (res.code == 4001){
        setQuery({status: 'init'});
      } else {
        getRec(connectionDetails);
        setQuery({status: 'claim-init'});
      }
    });
  }

  const getRec = async(currentConnection) => {
    const getRecc = await getRecipient(contractInstance, currentConnection);
    setContractInstance(getRecc.contractInstance);
    const emptyAddress = /^0x0+$/.test(getRecc.recipient);
    let recipient = emptyAddress ? currentConnection.connectedAddress : getRecc.recipient;
    setRepRecipient(recipient);

    let pendingTXClaim = JSON.parse(localStorage.getItem('pendingClaim')),
        pendingTXNewRec = JSON.parse(localStorage.getItem('pendingNewRec'));
    if (pendingTXClaim || pendingTXNewRec) {
      setQuery({status: "pending"});
      let pendingTXStatus = setInterval(() => {
        const txStatus = getPendingTXStatus(currentConnection, pendingTXClaim ?? pendingTXNewRec);
        txStatus.then((res) => {
          if (res) {
            setQuery({status: "claim-init"});
            clearInterval(pendingTXStatus);
          }
        });
      }, 7000);
    }
  }

  const backToSwitch = () => {
    props.toSwitch();
  }

  const backToRecipient = () => {
    setQuery({status: 'init'});
  }

  const skipAndClaim = () => {
    getRec(connectionDetails);
    setQuery({status: 'claim-init'});
  }
  
  const claimRep = async() => {
    setQuery({status: 'claim-start'});
    const claim = claimReputation(proof, connectionDetails, contractInstance);
    claim.then((res) => {
      //TODO:  Show succesfully claimed message
    }).catch((err) => {
      setQuery({status: 'claim-init'});
    });
  }

  return (
    <Container component="claim">
      <Box sx={{
        mb: 3,
      }}>
        <Button 
          variant="contained"
          sx={{
            mr: 1,
            backgroundColor: "#9c27b0",
           '&:hover': {
              backgroundColor: "#60156c"
            }
          }}
          onClick={() => backToSwitch()}
        >Switch Network</Button>
        {
          query.status === "claim-init" ?
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#9c27b0",
                '&:hover': {
                  backgroundColor: "#60156c"
                }
              }}
              onClick={() => backToRecipient()}
            >Change Recipient</Button>
          : null
        }
      </Box>
      <Typography paragraph={true}>
        Connected Network: <br />
        <Typography variant="span" sx={{fontWeight: 'bold'}}>
          {connectionDetails.connectedChain}
        </Typography>      
      </Typography>
      <Typography paragraph={true}>
        You will receive your tokens on address: <br />
        <Typography variant="span" sx={{fontWeight: 'bold'}}>
          {repRecipient}
        </Typography>
      </Typography>
      {
        query.status === 'init' ?
          <div>
            <Box
            component="form"
            onSubmit={changeRecipient}
            sx={{mt: 1}}
            >
            <Typography paragraph={true}>
              If you want to receive your GOOD tokens on a new address, set a new recipient below.
            </Typography>
            <Typography variant="span" color="red">
              REMEMBER TO ONLY USE ADDRESSESS WHICH ARE YOUR OWN AND SUPPORT ERC-20's
            </Typography>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <TextField
                margin="normal"
                required
                id="newRecipient"
                label="New Recipient"
                name="newRecipient"
                sx={{mr: 1}} />
              <Button 
                type="submit"
                variant="contained"
                sx={{
                  fontSize: '13px', 
                  mt: 3, 
                  mb: 2,
                  backgroundColor: "#00C3AE", 
                  '&:hover': {
                    backgroundColor: "#049484"
                  }
                }}
                >Set New Recipient</Button>

            </div>
          </Box>
          <Button
              variant="contained"
              sx={{ mt: 3, mb: 2}}
              onClick={() => skipAndClaim()}
            >Skip</Button>
          </div>
        :
        query.status === 'claim-start' || query.status === 'pending' ?
          <div>
            <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> <br />
            <Typography variant="span" sx={{fontStyle: 'italic'}} color="red">
                You have a current pending transaction, please wait till confirmation.
            </Typography>
          </div> 
        :   
        <Box>
          <Button
            variant="contained"
            fullWidth
            sx={{
              mt:3, 
              mb:2,
              backgroundColor: "#00C3AE", 
                '&:hover': {
                  backgroundColor: "#049484"
                }
            }}
            onClick={() => claimRep()}
          > claim your tokens
          </Button>
        </Box>
      }
    </Container> 
  )
}