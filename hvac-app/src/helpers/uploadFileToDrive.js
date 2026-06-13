//src/helpers/uploadFileToDrive.js
import axios from "axios";
import { auth } from "../firebase/firebase";

export const uploadFileToDrive = async (file) => {
  if (!file) throw new Error("No file provided");

  const uid = auth.currentUser?.uid;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("uid", uid);

  const res = await axios.post("http://localhost:4000/upload", formData);

  return {
    fileId: res.data.fileId,
    fileName: res.data.fileName,
    url: res.data.downloadLink,
  };
};