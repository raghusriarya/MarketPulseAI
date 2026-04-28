import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
    primary: {
      main: "#00e676", // terminal green
    },

    success: {
      main: "#00c853",
    },
    error: {
      main: "#ff5252",
    },
  },
  typography: {
    fontFamily: `"JetBrains Mono", monospace`,
    fontSize: 13,
  },
  shape: {
    borderRadius: 4, // sharp edges
  },
});

export default theme;
