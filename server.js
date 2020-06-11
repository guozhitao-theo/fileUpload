const express = require('express')
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const fse = require('fs-extra')
const path = require('path')
const fs = require('fs')

const app = express()

app.use(express.static(__dirname + '/public'))

app.use(bodyParser.urlencoded({extended: true}))

app.use(bodyParser.json())

const UPLOAD_DIR = path.resolve(__dirname, 'public/upload')

// 文件上传路由
app.post('/upload', (req, res) => {
	const form = new multiparty.Form({uploadDir: 'temp'})
	form.parse(req)
	form.on('file',async (name, chunk) => {
		console.log(chunk)
		// 存放 切片文件的目录
		let chunkDir = `${UPLOAD_DIR}/${chunk.originalFilename.split('.')[0]}`
		// 如果目录不存在 创建目录
		if(!fse.existsSync(chunkDir)) {
			await fse.mkdirs(chunkDir)
		}
		// 源文件名.index.suffix
		var dPath = path.join(chunkDir, chunk.originalFilename.split('.')[1])
		// 将分片从临时目录移动到 同名的存放目录
		await fse.move(chunk.path, dPath, {overwrite: true})
	})

	res.send('文件上传成功')
})

// 合并分片文件
app.post('/merge', async (req, res) => {
	let { name } = req.body
	// 文件名分割 不要后缀
	let fName = name.split('.')[0]
	// 合并 路径
	let chunkDir = path.join(UPLOAD_DIR, fName)
	// 读取 分片文件 索引 数组
	let chunks = await fse.readdir(chunkDir)
	// 按照索引过合并文件
	chunks.sort((a, b) => a - b ).map(chunkPath => {
		fs.appendFileSync(
			path.join(UPLOAD_DIR, name),// 合并的文件
			fs.readFileSync(`${chunkDir}/${chunkPath}`) // 分片遍历 按照索引 写入 
		)
	})
	// 移出 原来的分片 目录
	fse.removeSync(chunkDir)
	res.send({
		msg: '文件合并成功',
		url: `http://localhost:3000/upload/${name}`
	})
})

// 端口监听
app.listen(3000, () => {
	console.log('port: 3000')
})