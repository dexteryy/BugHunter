<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>.</title>
<link href="/app/css/main.css" rel="stylesheet" />
<style>html,body{height:auto;}</style>
</head>
<body>

<div class="library-list">
<table>
	<thead>
		<tr>
			<th style="width:30px;">序号</th>
			<th>图片</th>
			<th style="width:50px;">分数</th>
			<th style="width:50px;">扣分</th>
			<th style="width:80px;">
                <a href="/library/quiz/create" class="lnk-flat">上传新题</a>
            </th>
		</tr>
	</thead>
	<tfoot>
	</tfoot>
	<tbody>
    <% list.forEach(function(quiz, i){ %>
		<tr>
            <td><%=(i + 1)%></td>
			<td>
                <a href="/<%=quiz.pic%>" target="_blank" title="<%=escapeHTML(quiz.title)%>"><img src="/<%=quiz.pic%>" class="pic"></a>
            </td>
			<td><%=quiz.score%></td>
			<td><%=(quiz.punish || 0)%></td>
			<td>
                <a href="/library/quiz/<%=quiz._id%>" class="lnk-flat">编辑</a>
                <a href="#qid=<%=quiz._id%>" class="lnk-flat send-btn">发送</a>
            </td>
		</tr>
    <% }); %>
	</tbody>
</table>
</div>

<script>
parent.oz.require(['jquery', 'bughunter'], function($, app){
    $(document).find('.send-btn').click(function(){
        var qid = /qid=(.*)/.exec(this.href)[1];
        app.deliver(qid);
        app.closeDialog();
    });
});
</script>
</body>
</html>
