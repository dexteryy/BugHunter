<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>.</title>
<link href="/app/css/main.css" rel="stylesheet" />
<style>html,body{height:auto;}</style>
</head>
<body>

<div class="library-list library-rank">
<table>
	<thead>
		<tr>
			<th style="width:40px;">排名</th>
			<th style="width:120px;text-align:center;">头像</th>
			<th>ID</th>
			<th style="width:100px;">得分</th>
			<th style="width:50px;">答对</th>
			<th style="width:50px;">答错</th>
		</tr>
	</thead>
	<tfoot>
	</tfoot>
	<tbody>
    <% list.forEach(function(player, i){ %>
		<tr>
            <td class="rank"><%=(i + 1)%></td>
			<td style="text-align:center;">
                <img src="<%=player.avatar%>" class="avatar">
                <span><%=player.nic%></span>
            </td>
			<td><a href="http://www.douban.com/people/<%=player.usr%>" target="_blank"><%=player.usr%></a></td>
			<td class="score"><%=player.score%></td>
			<td class="score"><strong><%=player.correct%></strong></td>
			<td class="score"><em><%=player.mistake%></em></td>
		</tr>
    <% }); %>
	</tbody>
</table>
</div>

</body>
</html>
