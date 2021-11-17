import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";

const SwitchAndConnectButton = styled(Button)({
  height: "100px",
  width: "100px",
  backgroundSize: "90%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundColor: "#9c27b0",
  '&.chain-connected': {
      backgroundColor: "#00C3AE",
      '&:hover': {
          backgroundColor: "#049484"
      }
  },  
  '&:hover': {
      backgroundColor: "#60156c"
  }
});

export default SwitchAndConnectButton;