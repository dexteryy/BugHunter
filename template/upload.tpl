<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>.</title>
<link href="/app/css/main.css" rel="stylesheet" />
<style>html,body{height:auto;}</style>
</head>
<body>

<div class="library-upload">

<form action="/upload" enctype="multipart/form-data" method="post">
    <p>
        <label>标题</label><input type="text" name="title" value="<%=quiz.title%>">
    </p>
    <p>
        <label>分数</label><input type="number" name="score" value="<%=quiz.score%>" min="0" max="10" step="1" placeholder="1 ~ 10" required>
        <label>扣分</label><input type="number" name="punish" value="<%=quiz.punish%>" min="-10" max="0" step="1" placeholder="-10 ~ 0">
    </p>
    <p>
        <label>图片</label><input type="file" name="upload" multiple="multiple" value="<%=quiz.pic%>" required>
    </p>
    <p>
        <label>热区</label>
        <input type="number" name="w" value="<%=quiz.w%>" placeholder="w" required>
        <input type="number" name="h" value="<%=quiz.h%>" placeholder="h" required>
        <input type="number" name="x" value="<%=quiz.x%>" placeholder="x" required>
        <input type="number" name="y" value="<%=quiz.y%>" placeholder="y" required>
    </p>
    <p class="opt">
        <span class="bn-flat"><input type="submit" value="上传"></span>
    </p>
</form>

</div>

</body>
</html>
