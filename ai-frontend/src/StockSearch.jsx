import {
  Autocomplete,
  CircularProgress,
  InputAdornment,
  TextField,
} from "@mui/material";
import { Search } from "lucide-react";
import { useState } from "react";

function StockSearch({ onSelect }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  let debounceTimer;

  const fetchStocks = (value) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      if (!value) return;

      setLoading(true);

      const res = await fetch(`http://localhost:5000/search-stock?q=${value}`);
      const data = await res.json();

      setOptions(data);
      setLoading(false);
    }, 400); // debounce
  };

  return (
    <Autocomplete
      freeSolo
      sx={{ width: "100%" }}
      options={options}
      loading={loading}
      onInputChange={(e, value) => fetchStocks(value)}
      onChange={(e, value) => onSelect(value)}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option.label
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          placeholder="Search stock (e.g. RELIANCE)"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#0d1117",
              fontFamily: "JetBrains Mono",
              height: 40,
            },
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress size={18} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default StockSearch;
