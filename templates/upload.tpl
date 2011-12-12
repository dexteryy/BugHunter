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
<form action="/library/upload" enctype="multipart/form-data" method="post">
    <p>
        <label>标题</label><input type="text" name="title" value="<%=quiz.title%>" placeholder="（可选）">
    </p>
    <p>
        <label>分数</label><input type="number" name="score" value="<%=quiz.score%>" min="0" step="1" placeholder=">= 0" required />
        <label>扣分</label><input type="number" name="punish" value="<%=quiz.punish%>" max="0" step="1" placeholder="<= 0">
    </p>
<% if (quiz.pic) { %>
    <p class="pic">
        <a href="/<%=quiz.pic%>" target="_blank"><img src="/<%=quiz.pic%>" /></a>
        <input type="hidden" name="qid" value="<%=quiz._id%>" />
    </p>
<% } else { %>
    <p>
        <label>图片</label><input type="file" name="pic" multiple="multiple" value="" required />
    </p>
<% } %>
    <p>
        <label>热区</label>
        <input type="number" name="w" value="<%=quiz.w%>" placeholder="w" required />
        <input type="number" name="h" value="<%=quiz.h%>" placeholder="h" required />
        <input type="number" name="x" value="<%=quiz.x%>" placeholder="x" required />
        <input type="number" name="y" value="<%=quiz.y%>" placeholder="y" required />
    </p>
<% if (!quiz.pic) { %>
    <p class="opt">
        <span class="bn-flat"><input type="submit" value="上传"></span>
        <a href="/library/list" class="lnk-flat">返回列表</a>
    </p>
</form>
<% } else { %>
    <p class="opt">
        <span class="bn-flat"><input type="submit" value="更新"></span>
        <a href="/library/list" class="lnk-flat">返回列表</a>
    </p>
</form>
<form action="/library/upload" enctype="multipart/form-data" method="post">
<p class="opt">
    <input type="hidden" name="qid" value="<%=quiz._id%>" />
    <input type="hidden" name="opt" value="delete" />
    <span class="bn-flat delete-bn"><input type="submit" value="删除"></span>
</p>
</form>
<% } %>

</div>

</body>
</html>
