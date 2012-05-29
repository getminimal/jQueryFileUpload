<?php
move_uploaded_file($_FILES['file']['tmp_name'], "./test/{$_FILES['file']['name']}");
echo json_encode(array("files" => $_FILES, "post" => $_POST));