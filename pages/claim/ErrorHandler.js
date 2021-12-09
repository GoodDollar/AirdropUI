import React, {useState, useEffect} from 'react';
import Typography from "@mui/material/Typography";

const ErrorSpan = ({message}) => {
  return (
      <Typography variant="span" color="red">
          {message}
      </Typography> 
  );
}

export default function ErrorHandler(props) {
  const [errorMessage, setError] = useState(null);
  const [errorInit] = useState('init');
  const [errorStatus, setErrorStatus] = useState();

  let messages = {
    cancelled: 'You cancelled the connection/confirmation, try again!',
    pending: 'There is already an pending confirmation in your MetaMask.',
    wrongNetwork: 'Sorry, you seem to be connected to an unsupported network',
    wrongAddress: 'Sorry, you are not connected to the right address. '+ 
                  'Please disconnect first, then retry with the eligible address.',
    disconnect: 'You have disconnected from the dapp.',
    alreadyClaimed: 'You have already claimed your GOOD for this network'
  }

  let statusCodes = {4001: 'cancelled',
                     311: 'cancelled',
                     '-32002': 'pending',
                     310: 'wrongNetwork',
                     312: 'wrongAddress', 
                     313: 'disconnect',
                     318: 'alreadyClaimed'}

  let withTimeOut = ['cancelled', 'pending', 'disconnect'].join(":");

  useEffect(() => {
    for (const [code, status] of Object.entries(statusCodes)) {
      if (props.action.code == parseInt(code)){
        setErrorStatus(status);
        break;
      }
    }
  }, [errorInit]);

  useEffect(() => {
    setError(messages[errorStatus]);
    if (withTimeOut.indexOf(errorStatus) !== -1) {
      setTimeout(() => {
        setError(null);
      }, 2500);
    }
  },[errorStatus]);

  return (
    <ErrorSpan message={errorMessage} />
  )
};