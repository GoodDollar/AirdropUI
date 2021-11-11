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

  let messages = {
    cancelled: 'You cancelled the connection/confirmation, try again!',
    pending: 'There is already an pending confirmation in your MetaMask.',
    wrongNetwork: 'Sorry, you seem to be connected to an unsupported network',
    wrongAddress: 'Sorry, you are not connected to the right address. '+ 
                  'Please disconnect first, then retry with the eligible address.',
    disconnect: 'You have disconnected from the dapp.'
  }

  let statusCodes = {4001: 'cancelled',
                     311: 'cancelled',
                     '-32002': 'pending',
                     310: 'wrongNetwork',
                     312: 'wrongAddress', 
                     313: 'disconnect'}

  let withTimeOut = ['cancelled', 'pending', 'disconnect'].join(":");

  useEffect(() => {
    for (const [key, value] of Object.entries(statusCodes)) {
      if (props.action.code == parseInt(key)){
        props.action.status = value;
        break;
      }
    }
  }, [errorInit])

  useEffect(() => {
    setError(messages[props.action.status]);
    if (withTimeOut.indexOf(props.action.status) !== -1) {
      setTimeout(() => {
        setError(null);
      }, 2500);
    }
  },[]);

  return (
    <ErrorSpan message={errorMessage} />
  )
};