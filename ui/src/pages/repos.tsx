import { useQuery, useMutation, gql } from "@apollo/client";
import React, { useState, useEffect } from "react";

import Link from "@mui/material/Link";
import { Link as ReactLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import DeleteIcon from "@mui/icons-material/Delete";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import CircularProgress from "@mui/material/CircularProgress";
import SourceIcon from "@mui/icons-material/Source";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import ShareIcon from "@mui/icons-material/Share";
import Chip from "@mui/material/Chip";
import { ShareProjDialog } from "../components/ShareProjDialog";
import useMe from "../lib/me";
import { getUpTime } from "../lib/utils";
import { Button } from "@mui/material";

enum RepoTypes {
  repo = "myRepos",
  collab = "myCollabRepos",
}
enum RepoHintTemplate {
  myRepos = "Please create a new repo",
  myCollabRepos = "No shared repo yet. Invite your friend! ",
}
enum RepoTitleHint {
  myRepos = "Your repos",
  myCollabRepos = "Shared repos",
}
const FETCH_REPOS = gql`
  query GetRepos {
    myRepos {
      name
      id
      public
    }
  }
`;

const FETCH_COLLAB_REPOS = gql`
  query GetCollabRepos {
    myCollabRepos {
      name
      id
      public
    }
  }
`;

function RepoLine({ repo, deletable, sharable, runtimeInfo }) {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [deleteRepo] = useMutation(
    gql`
      mutation deleteRepo($id: ID) {
        deleteRepo(id: $id)
      }
    `,
    {
      refetchQueries: ["GetRepos"],
    }
  );
  const [killRuntime] = useMutation(
    gql`
      mutation killRuntime($sessionId: String!) {
        killRuntime(sessionId: $sessionId)
      }
    `,
    {
      refetchQueries: ["ListAllRuntimes"],
    }
  );

  const [killing, setKilling] = useState(false);
  return (
    <TableRow
      key={repo.id}
      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
    >
      <TableCell align="center">
        <Link component={ReactLink} to={`/repo/${repo.id}`}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <DescriptionOutlinedIcon
              sx={{
                marginRight: "5px",
              }}
            />
            {repo.name || "Untitled"}
          </Box>
        </Link>
      </TableCell>
      <TableCell align="left">
        <Chip
          label={repo.public ? "public" : "private"}
          size="small"
          variant={repo.public ? "outlined" : "filled"}
        ></Chip>
      </TableCell>
      <TableCell align="left">
        {runtimeInfo
          ? runtimeInfo.lastActive
            ? "last active: " + getUpTime(runtimeInfo.lastActive)
            : "running"
          : "-"}
      </TableCell>
      <TableCell align="left">
        {deletable && (
          <Tooltip title="Delete Repo">
            <IconButton
              size="small"
              onClick={async () => {
                // FIXME ensure the runtime is killed
                deleteRepo({
                  variables: {
                    id: repo.id,
                  },
                });
              }}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
        {runtimeInfo ? (
          <Tooltip title="Kill runtime">
            <IconButton
              disabled={killing}
              size="small"
              onClick={async () => {
                // FIXME when to set killing=false?
                setKilling(true);
                killRuntime({
                  variables: {
                    sessionId: `${me.id}_${repo.id}`,
                  },
                });
              }}
            >
              {killing ? (
                <CircularProgress size="14px" />
              ) : (
                <StopCircleIcon fontSize="inherit" />
              )}
            </IconButton>
          </Tooltip>
        ) : null}
        {/* {sharable && (
          <>
            <Tooltip title="Share">
              <IconButton size="small" onClick={() => setOpen(true)}>
                <ShareIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <ShareProjDialog
              open={open}
              title={repo.name}
              onClose={() => setOpen(false)}
              id={repo.id}
            />
          </>
        )} */}
      </TableCell>
    </TableRow>
  );
}

function RepoHintText({ type = RepoTypes.repo }) {
  return (
    <Box
      sx={{
        padding: "20px",
        color: "#6B87A2",
        fontSize: "18px",
        fontWeight: 600,
        display: "flex",
        // width: "100%",
        justifyContent: "center",
        alignContent: "center",
      }}
    >
      {RepoHintTemplate[type]}
    </Box>
  );
}

function CreateRepoForm(props) {
  const [createRepo] = useMutation(
    gql`
      mutation CreateRepo {
        createRepo {
          id
        }
      }
    `,
    {
      refetchQueries: ["GetRepos"],
    }
  );
  const navigate = useNavigate();
  return (
    <Box>
      <Button
        variant="contained"
        onClick={async () => {
          let res = await createRepo();
          if (res.data.createRepo.id) {
            navigate(`/repo/${res.data.createRepo.id}`);
          }
        }}
      >
        Create New Project
      </Button>
    </Box>
  );
}

function Repos({ url = FETCH_REPOS, type = RepoTypes.repo }) {
  const { loading, error, data } = useQuery(url);
  const { me } = useMe();
  const { loading: rt_loading, data: rt_data } = useQuery(gql`
    query ListAllRuntimes {
      listAllRuntimes {
        sessionId
        lastActive
      }
    }
  `);
  // peiredically update so that the last active time is updated
  //
  // FIXME once ttl is reached, the runtime is killed, but this rt_query is not
  // updated.
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(counter + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [counter]);
  if (loading || rt_loading) {
    return <CircularProgress />;
  }
  if (error) {
    return null;
  }
  const repos = data[type].slice().reverse();
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "20px",
        }}
      >
        <Box
          sx={{
            color: "#839DB5",
            fontSize: "25px",
          }}
        >
          {RepoTitleHint[type]} ({repos.length})
        </Box>
        {type === RepoTypes.repo && <CreateRepoForm />}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="left">Name</TableCell>
              <TableCell align="left">Visibility</TableCell>
              <TableCell align="left">Status (TTL: 12h)</TableCell>
              <TableCell align="left">Operations</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repos.map((repo) => (
              <RepoLine
                repo={repo}
                deletable={type === RepoTypes.repo}
                sharable={type === RepoTypes.repo}
                runtimeInfo={rt_data.listAllRuntimes.find(
                  ({ sessionId }) => sessionId === `${me.id}_${repo.id}`
                )}
                key={repo.id}
              />
            ))}
          </TableBody>
        </Table>
        {repos.length === 0 ? ( // If no repos
          <RepoHintText type={type} />
        ) : null}
      </TableContainer>
    </Box>
  );
}

function NoLogginErrorAlert() {
  const nevigate = useNavigate();
  const [seconds, setSeconds] = useState<number | null>(3);

  useEffect(() => {
    if (seconds === 0) {
      setSeconds(null);
      nevigate("/login");
      return;
    }
    if (seconds === null) return;

    const timer = setTimeout(() => {
      setSeconds((prev) => prev! - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <Box sx={{ maxWidth: "sm", alignItems: "center", m: "auto" }}>
      <Alert severity="error">
        Please login first! Automatically jump to{" "}
        <Link component={ReactLink} to="/login">
          login
        </Link>{" "}
        page in {seconds} seconds.
      </Alert>
    </Box>
  );
}
export default function Page() {
  const { me } = useMe();
  if (!me) {
    return <NoLogginErrorAlert />;
  }
  return (
    <Box sx={{ maxWidth: "sm", alignItems: "center", m: "auto" }}>
      {/* TODO some meta information about the user */}
      {/* <CurrentUser /> */}
      {/* TODO the repos of this user */}
      <Box
        sx={{
          fontSize: "14px",
          paddingTop: "10px",
          color: "#6B87A2",
          position: "relative",
        }}
      >
        👋 Welcome, {me?.firstname}! Please open or create a repository to get
        started.
      </Box>
      <Repos />
      <Repos url={FETCH_COLLAB_REPOS} type={RepoTypes.collab} />
    </Box>
  );
}
