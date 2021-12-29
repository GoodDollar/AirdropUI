// import Link from 'next/link'

import React, { useState, useCallback } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Tooltip from "@mui/material/Tooltip";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import StarIcon from "@mui/icons-material/Star";

import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Claim
import ClaimDialog from "./claim/claimDialog";
import IneligibleAddress from "./claim/ineligible.js";

async function copyText(text) {
  console.log({ text });
  if ("clipboard" in navigator) {
    return await navigator.clipboard.writeText(text);
  } else {
    return document.execCommand("copy", true, text);
  }
}

const CopyButton = ({ text }) => {
  const [open, setCopied] = useState(false);
  return (
    <Tooltip disableFocusListener title="Copied" open={open}>
      <IconButton
        onClick={() =>
          copyText(text).then((_) => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          })
        }
      >
        <ContentCopyOutlinedIcon />
      </IconButton>
    </Tooltip>
  );
};

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      <Link color="inherit" href="https://gooddollar.org/">
        GoodDollar
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const theme = createTheme();

const AirdropData = ({ hexProof, proofIndex, addr, reputationInWei }) => {
  return (
    <Box>
      <Paper>
        <List>
          <ListItem>
            <ListItemAvatar>
              <Avatar>
                <AccountCircleOutlinedIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={addr} />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <Avatar>
                <AccountBalanceOutlinedIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={"GOOD Tokens: " + reputationInWei / 1e18} />
            <CopyButton text={reputationInWei} />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <Avatar>
                <AdminPanelSettingsOutlinedIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText>
              <div
                style={{
                  width: "200px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "inline-block"
                }}
              >
                Proof: {hexProof}
              </div>
            </ListItemText>
            <CopyButton text={hexProof} />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <Avatar>
                <AdminPanelSettingsOutlinedIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={"Proof Index: " + proofIndex} />
            <CopyButton text={proofIndex} />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
};
export default function SignIn() {
  const [data, setData] = useState();

  // for triggering the dialog
  const [diaOpen, setOpen] = useState(false);
  const [diaNoGood, setErrorOpen] = useState(false);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    const addr = event.currentTarget.wallet.value;
    const result = await fetch(`/api/repAirdrop/${addr}`)
                   .then((_) => _.json());
    setData(result);
    result.error ? setErrorOpen(true) : setOpen(true);
  }, [setData, setErrorOpen, setOpen]);

  const handleClose = useCallback((value) => {
    setOpen(false);
  }, [setOpen]);

  const handleErrorClose = useCallback((value) => {
    setErrorOpen(false);
  }, [setErrorOpen]);

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <AccountCircleOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            GOOD Airdrop
          </Typography>
          <Paper>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  fontSize="medium"
                  primary={"GOOD tokens are non transferable"}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    "GOOD tokens are expected to have a market value of 0$"
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    "GOOD tokens will be minted at a rate of 96M per year"
                  }
                />
              </ListItem>
            </List>
            <Grid columns={1} container justifyContent={"center"}>
              <Grid item xs={12} textAlign={"center"}>
                <Link
                  href="https://medium.com/@GoodDollarHQ/introducing-the-gooddao-gooddollar-governance-d6f4f6a5e822"
                  variant="body2"
                >
                  {"Read more here"}
                </Link>
              </Grid>
              <Grid item xs={12} textAlign={"center"}>
                <Link
                  href="https://www.gooddollar.org/good-governance-distribution-results-from-the-snapshot/"
                  variant="body2"
                >
                  {"and here"}
                </Link>
              </Grid>
            </Grid>
          </Paper>
          {data ? <AirdropData {...data} /> : null}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="wallet"
              label="Wallet Address"
              name="wallet"
              autoComplete="wallet"
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Check Eligibility
            </Button>
          </Box>
        </Box>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </Container>
      {/* Claim-Logic Below */}
      <Container component="claim" maxWidth="xs"
        sx={{
          position: "relative",
          top: 0,
          right: "230px",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"

        }}>
        <Box>
          { data ? 
            data.error ?
              <IneligibleAddress open={diaNoGood} 
                                  onClose={handleErrorClose}></IneligibleAddress>
            :
            data.addr ?
            // the claim dialog 
            <ClaimDialog proofData={data}
                         open={diaOpen}
                         onClose={handleClose}></ClaimDialog>
              : null
              : null 
          }
        </Box>
      </Container>
      {/* End of Claim-Logic */}
    </ThemeProvider>
  );
}
