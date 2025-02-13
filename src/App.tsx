import {
  Container,
  VStack,
  Input,
  Button,
  ButtonGroup,
  Heading,
  Text,
  Box,
  Stack,
  Select,
  useToast,
  useColorMode,
  extendTheme,
  IconButton,
  Progress,
  Image,
  Skeleton,
  SkeletonText,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { MdMusicNote } from "react-icons/md";

interface DownloadResponse {
  message: string;
  download_url: string;
  thumbnail_url: string;
  debug_info: string;
}

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
}

interface Download {
  id: string;
  url: string;
  progress: number;
  status: "preparing" | "downloading" | "converting" | "complete" | "error";
  error?: string;
  title?: string;
}

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({ config });

function App() {
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  const [format, setFormat] = useState<"mp3" | "mp4">("mp3");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [quality, setQuality] = useState("best");
  
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isVideoInfoLoading, setIsVideoInfoLoading] = useState(false);
  const [downloads, setDownloads] = useState<Record<string, Download>>({});

  const qualityOptions =
    format === "mp3"
      ? [
          { value: "best", label: "High Quality" },
          { value: "medium", label: "Medium Quality" },
          { value: "worst", label: "Low Quality" },
        ]
      : [
          { value: "best", label: "Best Quality" },
          { value: "medium", label: "Medium Quality" },
          { value: "worst", label: "Low Quality" },
        ];

  // Add this function to remove completed downloads after a delay
  const removeDownloadAfterDelay = (downloadId: string, delay: number = 3000) => {
    setTimeout(() => {
      setDownloads(prev => {
        const newDownloads = { ...prev };
        delete newDownloads[downloadId];
        return newDownloads;
      });
    }, delay);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    const downloadId = Date.now().toString();
    const formData = new FormData();
    formData.append("video_url", url);
    formData.append("quality", quality);
    let progressInterval: number = 0;

    setDownloads(prev => ({
      ...prev,
      [downloadId]: {
        id: downloadId,
        url,
        progress: 0,
        status: "preparing",
        title: videoInfo?.title || url
      }
    }));

    try {
      setIsLoading(true);
      setError("");

      let artificialProgress = 0;
      progressInterval = setInterval(() => {
        artificialProgress += 1;
        if (artificialProgress <= 95) {
          setDownloads(prev => ({
            ...prev,
            [downloadId]: {
              ...prev[downloadId],
              progress: artificialProgress,
              status: artificialProgress < 30 ? "preparing" : 
                     artificialProgress < 80 ? "downloading" : 
                     "converting"
            }
          }));
        }
      }, 100);

      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/download`;

      const response = await axios.post<DownloadResponse>(apiUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onDownloadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / (progressEvent.total || 100)) * 100;
          if (progress > artificialProgress) {
            const actualProgress = Math.min(99, progress);
            setDownloads(prev => ({
              ...prev,
              [downloadId]: {
                ...prev[downloadId],
                progress: actualProgress,
                status: actualProgress < 30 ? "preparing" : 
                       actualProgress < 80 ? "downloading" : 
                       "converting"
              }
            }));
          }
        },
      });

      // Update final state
      setDownloads(prev => ({
        ...prev,
        [downloadId]: {
          ...prev[downloadId],
          progress: 100,
          status: "complete"
        }
      }));

      const downloadLink = `${import.meta.env.VITE_API_BASE_URL}${response.data.download_url}`;

      // Trigger download automatically
      const link = document.createElement("a");
      link.href = downloadLink;
      link.download = downloadLink.split("/").pop() || "audio.mp3";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Schedule removal after showing completion
      removeDownloadAfterDelay(downloadId);

      // Reset URL and show success toast
      setUrl("");
      setVideoInfo(null);
      toast({
        title: "Success!",
        description: "Your file is being downloaded.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    } catch (err: any) {
      clearInterval(progressInterval); // Make sure to clear interval on error
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.detail || "Conversion failed"
        : "An error occurred during conversion";

      setDownloads(prev => ({
        ...prev,
        [downloadId]: {
          ...prev[downloadId],
          status: "error",
          error: errorMessage
        }
      }));

      // Schedule removal of the error state
      removeDownloadAfterDelay(downloadId, 5000);

      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);
    if (newUrl.includes("youtube.com") || newUrl.includes("youtu.be")) {
      try {
        setIsVideoInfoLoading(true);
        setVideoInfo(null);

        const formData = new FormData();
        formData.append("video_url", newUrl);

        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/prepare`,
          formData
        );

        setVideoInfo(response.data);
        setError("");
      } catch (err: any) {
        setVideoInfo(null);
        setError("Could not fetch video information");
      } finally {
        setIsVideoInfoLoading(false);
      }
    } else {
      setVideoInfo(null);
    }
  };

  // Update the ActiveDownloads component to show detailed progress
  const ActiveDownloads = () => (
    <VStack spacing={4} w="full">
      {Object.values(downloads).map((download) => (
        <Box
          key={download.id}
          w="full"
          p={4}
          bg={colorMode === "dark" ? "#27272A" : "gray.100"}
          borderRadius="md"
        >
          <VStack spacing={2} align="start" w="full">
            <Text fontSize="sm" noOfLines={1} fontWeight="medium">
              {download.title || download.url}
            </Text>
            <Progress
              size="md"
              value={download.progress}
              colorScheme={
                download.status === "error" ? "red" : 
                download.status === "complete" ? "green" : "blue"
              }
              w="full"
              borderRadius="full"
              hasStripe
              isAnimated={download.status !== "complete"}
            />
            <Stack 
              direction="row" 
              w="full" 
              justify="space-between" 
              align="center"
            >
              <Text 
                fontSize="sm" 
                color={
                  download.status === "error" ? "red.500" :
                  download.status === "complete" ? "green.500" :
                  undefined
                }
              >
                {download.status === "error" ? download.error : 
                 download.status === "preparing" ? "Preparing download..." :
                 download.status === "downloading" ? "Downloading" :
                 download.status === "converting" ? "Converting" :
                 "Download Complete!"}
              </Text>
              <Text 
                fontSize="sm" 
                fontWeight="bold"
                color={
                  download.status === "complete" ? "green.500" :
                  download.status === "error" ? "red.500" :
                  "blue.500"
                }
              >
                {download.progress}%
              </Text>
            </Stack>
          </VStack>
        </Box>
      ))}
    </VStack>
  );

  return (
    <>
      <VStack minH="100vh" spacing={0} position="relative" zIndex={1} bg={colorMode === "dark" ? "#09090B" : "#3182ce"}>
        {/* Header */}
        <Container maxW="container.md" py={4}>
          <Stack
            direction={{ base: "row" }}
            justify="space-between"
            align={{ base: "center", sm: "center" }}
            w="full"
            spacing={{ base: 4, sm: 0 }}
          >
            <Stack
              direction="row"
              align="center"
              spacing={2}
            >
              <MdMusicNote size={24} color="white" />
              <Heading color="white" size="lg">
                YTMP3
              </Heading>
            </Stack>
            <IconButton
              size="sm"
              aria-label="Toggle color mode"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
            />
          </Stack>
        </Container>

        {/* Main Content */}
        <Box flex="1" w="full">
          <Container maxW="container.md" py={8}>
            <VStack
              spacing={6}
              bg={colorMode === "dark" ? "#1C1C1F" : "white"}
              color={colorMode === "dark" ? "white" : "black"}
              p={8}
              borderRadius="lg"
              boxShadow="lg"
            >
              <Text fontSize="lg" fontWeight="bold">
                Insert a valid video URL
              </Text>
              <Input
                placeholder="youtube.com/watch?v=..."
                size="lg"
                bg={colorMode === "dark" ? "#27272A" : "white"}
                color={colorMode === "dark" ? "white" : "black"}
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                borderColor={colorMode === "dark" ? "#27272A" : "gray.200"}
                _hover={{
                  borderColor: colorMode === "dark" ? "#383838" : "gray.300",
                }}
                _focus={{
                  borderColor: "blue.500",
                  bg: colorMode === "dark" ? "#383838" : "white",
                }}
              />

              <Select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                size="lg"
                bg={colorMode === "dark" ? "#27272A" : "white"}
                color={colorMode === "dark" ? "white" : "black"}
                borderRadius="md"
                width="full"
                borderColor={colorMode === "dark" ? "#27272A" : "gray.200"}
                _hover={{
                  borderColor: colorMode === "dark" ? "#383838" : "gray.300",
                }}
                _focus={{
                  borderColor: "blue.500",
                  bg: colorMode === "dark" ? "#383838" : "white",
                }}
              >
                {qualityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Stack
                direction={{ base: "column", md: "row" }}
                spacing={4}
                justify="space-between"
                w="full"
                align={{ base: "stretch", md: "center" }}
              >
                <ButtonGroup
                  isAttached
                  bg={colorMode === "dark" ? "#27272A" : "gray.100"}
                  p={1}
                  borderRadius="full"
                  spacing={0}
                  size="sm"
                  width={{ base: "full", md: "auto" }}
                >
                  <Button
                    flex={{ base: 1, md: "auto" }}
                    colorScheme="gray"
                    bg={
                      format === "mp3"
                        ? colorMode === "dark"
                          ? "#383838"
                          : "white"
                        : "transparent"
                    }
                    color={
                      format === "mp3"
                        ? colorMode === "dark"
                          ? "white"
                          : "gray.700"
                        : colorMode === "dark"
                        ? "gray.400"
                        : "gray.500"
                    }
                    onClick={() => setFormat("mp3")}
                    borderRadius="full"
                    px={6}
                    _hover={{
                      bg:
                        format === "mp3"
                          ? colorMode === "dark"
                            ? "#383838"
                            : "white"
                          : colorMode === "dark"
                          ? "#383838"
                          : "gray.200",
                    }}
                    boxShadow={format === "mp3" ? "sm" : "none"}
                  >
                    MP3
                  </Button>
                  <Button
                    flex={{ base: 1, md: "auto" }}
                    disabled
                    colorScheme="gray"
                    bg={
                      format === "mp4"
                        ? colorMode === "dark"
                          ? "#383838"
                          : "white"
                        : "transparent"
                    }
                    color={
                      format === "mp4"
                        ? colorMode === "dark"
                          ? "white"
                          : "gray.700"
                        : colorMode === "dark"
                        ? "gray.400"
                        : "gray.500"
                    }
                    onClick={() => setFormat("mp4")}
                    borderRadius="full"
                    px={6}
                    _hover={{
                      bg:
                        format === "mp4"
                          ? colorMode === "dark"
                            ? "#383838"
                            : "white"
                          : colorMode === "dark"
                          ? "#383838"
                          : "gray.200",
                    }}
                    boxShadow={format === "mp4" ? "sm" : "none"}
                  >
                    MP4
                  </Button>
                </ButtonGroup>
                <Button
                  width={{ base: "full", md: "auto" }}
                  size="md"
                  colorScheme={
                    colorMode === "dark" ? "whiteAlpha" : "blackAlpha"
                  }
                  bg={colorMode === "dark" ? "white" : "black"}
                  color={colorMode === "dark" ? "black" : "white"}
                  onClick={handleConvert}
                  isLoading={isLoading}
                  borderRadius="full"
                  loadingText="Converting..."
                  _hover={{
                    bg: colorMode === "dark" ? "gray.100" : "gray.800",
                    transform: "scale(1.02)",
                  }}
                >
                  Convert
                </Button>
              </Stack>
              {error && (
                <Text color="red.500" fontSize="sm">
                  {error}
                </Text>
              )}
              {url && !videoInfo && !error && isVideoInfoLoading && (
                <Box
                  w="full"
                  p={4}
                  bg={colorMode === "dark" ? "#27272A" : "gray.100"}
                  borderRadius="md"
                >
                  <Stack
                    direction={{ base: "column", sm: "row" }}
                    spacing={4}
                    align={{ base: "center", sm: "center" }}
                  >
                    <Skeleton
                      boxSize={{ base: "150px", sm: "100px" }}
                      borderRadius="md"
                      startColor={colorMode === "dark" ? "#1C1C1F" : "gray.200"}
                      endColor={colorMode === "dark" ? "#383838" : "gray.400"}
                    />
                    <VStack
                      align={{ base: "center", sm: "start" }}
                      spacing={1}
                      flex="1"
                    >
                      <SkeletonText
                        noOfLines={2}
                        spacing={2}
                        skeletonHeight={4}
                        width="full"
                        startColor={colorMode === "dark" ? "#1C1C1F" : "gray.200"}
                        endColor={colorMode === "dark" ? "#383838" : "gray.400"}
                      />
                      <Skeleton 
                        height="18px" 
                        width="100px"
                        startColor={colorMode === "dark" ? "#1C1C1F" : "gray.200"}
                        endColor={colorMode === "dark" ? "#383838" : "gray.400"}
                      />
                    </VStack>
                  </Stack>
                </Box>
              )}
              {videoInfo && (
                <Box
                  w="full"
                  p={4}
                  bg={colorMode === "dark" ? "#27272A" : "gray.100"}
                  borderRadius="md"
                >
                  <Stack
                    direction={{ base: "column", sm: "row" }}
                    spacing={4}
                    align={{ base: "center", sm: "center" }}
                  >
                    <Image
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      boxSize={{ base: "150px", sm: "100px" }}
                      objectFit="cover"
                      borderRadius="md"
                    />
                    <VStack align={{ base: "center", sm: "start" }} spacing={1}>
                      <Text
                        fontWeight="bold"
                        textAlign={{ base: "center", sm: "left" }}
                      >
                        {videoInfo.title}
                      </Text>
                      <Text fontSize="sm">
                        Duration: {Math.floor(videoInfo.duration / 60)}:
                        {(videoInfo.duration % 60).toString().padStart(2, "0")}
                      </Text>
                    </VStack>
                  </Stack>
                </Box>
              )}
            </VStack>

            {/* Add ActiveDownloads component after the converter UI */}
            {Object.keys(downloads).length > 0 && (
              <VStack
                mt={6}
                spacing={6}
                bg={colorMode === "dark" ? "#1C1C1F" : "white"}
                color={colorMode === "dark" ? "white" : "black"}
                p={8}
                borderRadius="lg"
                boxShadow="lg"
              >
                <Text fontSize="lg" fontWeight="bold">
                  Active Downloads
                </Text>
                <ActiveDownloads />
              </VStack>
            )}

            {/* Description Section */}
            <VStack
              bg={colorMode === "dark" ? "#1C1C1F" : "white"}
              color={colorMode === "dark" ? "white" : "black"}
              p={8}
              mt={8}
              borderRadius="lg"
              align="start"
              spacing={6}
            >
              <Heading 
                size="lg"
                bgGradient={
                  colorMode === "dark"
                    ? "linear(to-r, blue.300, cyan.300)"
                    : "linear(to-r, blue.500, cyan.500)"
                }
                bgClip="text"
                _hover={{
                  bgGradient: colorMode === "dark"
                    ? "linear(to-r, blue.200, cyan.200)"
                    : "linear(to-r, blue.600, cyan.600)"
                }}
                transition="all 0.3s ease"
              >
                YouTube Video Converter
              </Heading>
              <Text>
                Transform your favorite YouTube content into downloadable files
                with our converter tool. Whether you need audio-only MP3 files
                for music and podcasts, or MP4 video files for offline viewing,
                our platform makes it simple and straightforward.
              </Text>
              <Text>
                We prioritize quality in our conversions while maintaining
                reasonable file sizes. For optimal performance and faster
                processing, we support videos up to 60 minutes in length. This
                helps ensure quick and reliable conversions for all users.
              </Text>
              <Text>
                This tool is web-based and requires no additional downloads or
                installations. Before using our service, please review our{" "}
                <Text
                  as="span"
                  color="blue.600"
                  textDecoration="underline"
                  cursor="pointer"
                >
                  Usage Guidelines
                </Text>
                .
              </Text>
              <Heading 
                size="lg"
                bgGradient={
                  colorMode === "dark"
                    ? "linear(to-r, blue.300, cyan.300)"
                    : "linear(to-r, blue.500, cyan.500)"
                }
                bgClip="text"
                _hover={{
                  bgGradient: colorMode === "dark"
                    ? "linear(to-r, blue.200, cyan.200)"
                    : "linear(to-r, blue.600, cyan.600)"
                }}
                transition="all 0.3s ease"
              >
                Quick Start Guide
              </Heading>
              <VStack align="start" spacing={4} w="full">
                <Text>
                  1. Find your desired YouTube video and copy its URL from the
                  address bar.
                </Text>
                <Text>
                  2. Select your preferred format (MP3 for audio-only, MP4 for
                  video with audio).
                </Text>
                <Text>
                  3. Press "Convert" and wait briefly while we process your
                  file. Once complete, you'll see a download button to save your
                  converted file.
                </Text>
                <Text mt={4}>
                  We appreciate you choosing our converter tool for your media
                  needs.
                </Text>
                <Text>
                  Need help finding specific videos? Check out our recommended
                  tool{" "}
                  <Text
                    as="span"
                    color="blue.600"
                    textDecoration="underline"
                    cursor="pointer"
                  >
                    VideoSearch
                  </Text>
                  .
                </Text>
              </VStack>
            </VStack>
          </Container>
        </Box>

        {/* Footer */}
        <Container maxW="container.md" py={4} mt="auto">
          <Stack
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            w="full"
            align={{ base: "center", md: "center" }}
            spacing={{ base: 4, md: 0 }}
          >
            <Text color="white" textAlign={{ base: "center", md: "left" }}>
              © {new Date().getFullYear()} Made by Pheak. All rights reserved.
            </Text>
            <Stack
              direction={{ base: "column", md: "row" }}
              spacing={{ base: 2, md: 4 }}
              align="center"
            >
              <Text color="white" cursor="pointer">
                Privacy Policy
              </Text>
              <Text color="white" cursor="pointer">
                Terms of Service
              </Text>
              <Text color="white" cursor="pointer">
                Contact
              </Text>
            </Stack>
          </Stack>
        </Container>
      </VStack>
    </>
  );
}

export default App;
