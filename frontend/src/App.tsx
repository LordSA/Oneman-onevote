import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Box, Flex, Button } from "@chakra-ui/react";
import { VoterPage } from "./pages/VoterPage";
import { BoothPage } from "./pages/BoothPage";

function App() {
  return (
    <Router>
      <Box minH="100vh">
        <Flex
          as="nav"
          p={4}
          bg="gray.800"
          color="white"
          justify="space-between"
          align="center"
        >
          <Box fontWeight="bold">SecureVote</Box>
          <Flex gap={4}>
            <Link to="/">
              <Button size="sm" colorScheme="blue">
                Voter View
              </Button>
            </Link>
            <Link to="/booth">
              <Button size="sm" colorScheme="purple">
                Booth View
              </Button>
            </Link>
          </Flex>
        </Flex>

        <Routes>
          <Route path="/" element={<VoterPage />} />
          <Route path="/booth" element={<BoothPage />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
