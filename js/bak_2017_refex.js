//refex.js 0.1
(function () {
    get_all_sample();

    var ginf, //検索キーとするgene idとプロパティのオブジェクト
        g_infs = [], //ポートフォリオとして保持するデータ
        r_inf, //refex_idに紐づくデータデータセット
        r_infs = {}, // 取得したgene_ info＋r_infoをまとめたobject.gidをキーとする。
        s_r_infs = [], //選択されたchart描画のためのデータを持つrefex情報のarray
        s_inf = {}, // データセットを抜粋したオブジェクト
        slen = 10, // 抜粋するデータ長
        colors = d3.scaleOrdinal().range(["steelblue", "tomato", "yellowgreen", "Navy", "orange", "maroon", "olive"]),
        symbol = [ d3.symbol().size(30).type(d3.symbolTriangleLeft), d3.symbol().size(30).type(d3.symbolTriangleRight)],
        r = function (n) {
            return Array.from(Array(n).keys())
        }, //range()メソッドの実装；
        endpoint = 'https://integbio.jp/rdf/sparql',
        container_width = document.getElementById('barchart').offsetWidth,
        tbl,
        scnf = {width: 600, height: 40, margin: 30, b: 40, l: 20, r: 50},
        // focus & context chart confs
        bcnf = {width: (container_width - 240), height: 120, hide: 0, margin: 30, t: 20, b: 35, l: 30, r: 8},
        ccnf = {h: 40, t: 8, b: 30},
        xg, // globalなxscale
        xa = d3.scaleBand().range([0, bcnf.width - (bcnf.l + bcnf.r)]), // x scale for focused chart
        yb = d3.scaleLinear().range([bcnf.height, 0]),
        xc = d3.scaleBand().range([0, bcnf.width - (bcnf.l + bcnf.r)]), // x scale for context chart
        yc = d3.scaleLinear().range([ccnf.h, 0]),
        xs = d3.scaleBand().range([0, bcnf.width - (bcnf.l + bcnf.r)]),  // x scale for sorted chart
        //xz = d3.scaleBand().padding(0.05);
        xz = d3.scaleBand(),
        sym = [],
        gBrush,
        makeAnnotations,
        labels,
        hcnf = {top: 50, right: 0, bottom: 100, left: 30},
        hw = 1020,
        hh = 740,
        gridw = 4,
        gridh = 10,
        glst,
        //refex_api = 'http://localhost:8080/';
        refex_api = 'http://52.193.15.45/';

    // bbchartを描画するsvgの設定。
    var svg = d3.select('#barchart .chart').append('svg').attr('class', 'bar_chart')
        .attr('width', bcnf.width).attr('height', (bcnf.hide));

    var focus = svg.append('g').attr('class', 'focus').attr('transform', 'translate(' + bcnf.l + ',' + bcnf.t + ')');
    var context = svg.append('g').attr('class', 'context').attr('transform', 'translate(' + bcnf.l + ',' + ( +bcnf.height + +bcnf.t + ccnf.t) + ')');

    // 凡例
    var legend_view = svg.append('g').attr('class', 'legend_view').attr('transform', 'translate(30, 200)');
    var ctrl_view = svg.append('g').attr('class', 'contrl_view').attr('transform', 'translate(' + (bcnf.width - 50) + ',' + (bcnf.height + ccnf.h + 50) + ' )');

    var bbchart_info = d3.select('#barchart .info').append('div').attr('class', 'bbchart_info').attr('y', -30)
        .attr('width', 10).attr('style', 'left:' + bcnf.width);

    var brush = d3.brushX()
        .extent([[0, 0], [bcnf.width - bcnf.l, ccnf.h]])
        .on("brush end", brushed);

    var g_brush = d3.brushX()
        .extent([[0, 0], [bcnf.width - bcnf.l, ccnf.h]])
        .on("brush end", g_brushed);

    var xAxisb = d3.axisBottom(xa).tickSize(0).tickFormat(''),
        //xAxisc = d3.axisBottom(xc).tickSize(2).tickValues(xc.domain().filter(function(d,i){return (i % 20) == 0})).tickFormat(function (d) {return d.slice(-4)}),
        xAxisc = d3.axisBottom(xc).tickSize(0).tickFormat(''),
        xAxiss = d3.axisBottom(xs).tickSize(2).tickValues(xc.domain().filter(function (d, i) {
            return (i % 20) == 0
        })).tickFormat(function (d) {
            return d.slice(-4)
        }),
        yAxisb = d3.axisLeft(yb);

    // heatmap confs
    var heatmap = d3.select("#map").append("svg")
        .attr("width", hw + hcnf.left + hcnf.right)
        .attr("height", hh + hcnf.top + hcnf.bottom)
        .append("g")
        .attr("transform", "translate(" + hcnf.left + "," + hcnf.top + ")");

    var xh = d3.scaleOrdinal(), //
    colnum = Math.floor(hw / gridw),  //jsには整数型がないため整数を切り捨てして返すためにはMath.floorを使う
    xpos = function (i) {return i % colnum * gridw},
    ypos = function (i) {return (Math.floor(i / colnum)) * gridh},
    gradient = ["#444466", "555599", "#6363FF", "#6373FF", "#63A3FF", "#63E3FF", "#63FFFB", "#63FFCB",
        "#63FF9B", "#7BFF63", "#BBFF63", "#DBFF63", "#EEFF63", "#FFFF66", "#FFD363", "#FFB363", "#FF6364"],
    co = d3.scaleQuantize().range(gradient);

    /*
     * オートコンプリートの定義, summaryデータ取得
     */

    var org = $("[name=orgs]:checked").val();
    //target_data_set = './data/refex_gene_info_' + org + '.json';

    // bloodhoudオブジェクトを定義
    var gene_info = function (path) {
        return new Bloodhound({
            limit: 20,
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value', 'id', 'Symbol'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            prefetch: path
        })
    };

    var gene_info_human = gene_info('./data/refex_gene_human.json');
    var gene_info_mouse = gene_info('./data/refex_gene_mouse.json');

    // 選択した遺伝子のgene idでrefexの情報を取得
    get_refex_info =　function(gid) {
        var qs = encodeURIComponent(query_refex_info(gid));
        var q = endpoint + "?query=" + qs;
        d3.xml(q, function (error, xmlRoot) {
            r_inf = Array.from(xmlRoot.querySelectorAll('result'), function (x) {
                return x2obj(x)
            });
            //summary_chart(ginf, summary_data(r_inf));
            summary_chart(ginf, r_inf, gid);
            store_data(ginf, r_inf);
        })
    };

    //一括描画のための関数。<< L:351
    get_refex_info_asyn =　function(g, n, s) {
        var infs = {};
        orgs = $("[name=orgs]:checked").val();
        infs[g] = {gid: g, name: n, symbol: s, organism: org};

        if(!r_infs[g]) {
            var qs = encodeURIComponent(query_refex_info(g));
            var q = endpoint + "?query=" + qs;
            d3.xml(q, function (error, xmlRoot) {
                r_inf = Array.from(xmlRoot.querySelectorAll('result'), function (x) {
                    return x2obj(x)
                });
                summary_chart(infs[g],r_inf, g);
                store_data(infs[g], r_inf);
            })
        }
    };

    // sample reference取得 <<廃止
    /*
    function get_sample_ref(sample) {
        var item = sample_ref[sample];
        show_reference(item);
    }
    */

    // NodeListをオブジェクトに変換
    function x2obj(x) {
        var item = {};
        item['refex'] = x.querySelectorAll('[name=refex]').item(0).textContent.split('/').pop();
        item['sample'] = x.querySelectorAll('[name=sample]').item(0).textContent.split('/').pop();
        //item['organism'] = x.querySelectorAll('[name=organism]').item(0).textContent.split('/').pop();//gene_idは主語とユニークなため不必要
        item['exp_val'] = x.querySelectorAll('[name=expression_value]').item(0).textContent;
        item['cat'] = x.querySelectorAll('[name=sample_category]').item(0).textContent;
        return item
    }

    //sample referenceをobjectに変換。不定長のオブジェクトにあらかじめ変形する。
    function s2obj(x) {
        var item = {};
        item['cell'] = x.querySelectorAll('[name=cell]').item(0).textContent.split('/').pop();
        item['fantom'] = x.querySelectorAll('[name=fantom]').item(0).textContent.split('/').pop();
        item['disease'] = x.querySelectorAll('[name=disease]').item(0).textContent.split('/').pop();
        item['uberon'] = x.querySelectorAll('[name=uberon]').item(0).textContent.split('/').pop();
        return item;
    }

    //取得したオブジェクトを一時保存する
    function store_data(c, d) {
        var i = c.gid;
        var a = [c, d];
        r_infs[i] = a;
    }

    // オートコンプリートを初期化
    gene_info_human.initialize();
    gene_info_mouse.initialize();

    /*
     * barchart定義
     */

    //要約データ生成　//不要となった。
    /*
    function summary_data(d) {
        //dataをslenに分割したときの間隔nを取得
        n = parseInt(d.length / slen);
        s_inf = [];
        for (i in r(slen)) {
            s_inf.push(d[i * n]);
        }
        return s_inf
    }
    */

    //要約チャート・要約情報render
    function summary_chart(c, data, g) {
        data.forEach(function (g) {
            g.exp_val = +d3.format(".2f")(g.exp_val);
        });

        // scale（d3v4 ordinal scale）
        var names = data.map(function (d) {
                return d.refex
            }), // 抽出したサンプル名
            xs = d3.scaleBand().range([0, scnf.width]),
            ys = d3.scaleLinear().range([scnf.height, 0]);

        xs.domain(names);
        ys.domain([0, d3.max(data, function (d) {
            return d.exp_val
        })]);
        // axis
        var xAxis = d3.axisBottom().scale(xs).tickSize(0).tickFormat(""),
            yAxis = d3.axisLeft().scale(ys).ticks(3);

        //name, id, symbol
        var profile = d3.select('.summary_list').append('div').attr('class', 'profile').attr('id', 'gid' + g);
        var info = profile.append('div').attr('class', 'infos');

        info.append('h2')
            .attr('class', 'name')
            .text(c.name)
            .on('click', function () {
                learn_more([c.gid])
            });

        info.append('div')
            .attr("class", "info")
            .html(`
                    <div class="symbol">${c.symbol}</div> 
                    <div class="gid">gene id: <a href="https://www.ncbi.nlm.nih.gov/gene/${c.gid}">${c.gid}</a></div>
            `);

        var summary_chart = profile.append('div').attr('class', 'summary');

        // tableに"Add to List"するボタン
        var info_btn = info.append('div').attr('class', 'btns');
        info_btn.append('div').attr('class', 'btn add_list')
            .html(`<button type="button" class="btn btn-primary btn-xs"> Add to List <span class="glyphicon glyphicon-plus"></span> </button>
            `)
            .on('click', function () {
                add_to_list(c)
            });
        info_btn.append('div').attr('class', 'btn rm_item')
            .html(`<button type="button" class="btn btn-primary btn-xs"> Remove this item <span class="glyphicon glyphicon-plus"></span> </button>`)
            .on('click', function () {
                rm_item(c)
            });

        // barchart
        var svg = summary_chart.append('svg').attr("width", scnf.width).attr("height", (scnf.height + scnf.b));

        svg.append("g").selectAll('.bar').data(data)
            .enter().append("rect")
            .attr("style", "fill:steelblue")
            .attr("x", function (d) {
                return xs(d.refex)
            })
            .attr("width", xs.bandwidth())
            .attr("y", function (d) {
                return ys(d.exp_val)
            })
            .attr("height", function (d) {
                return scnf.height - ys(d.exp_val)
            })
            .attr("transform", "translate(" + scnf.l + "," + scnf.margin + ")");

        svg.append("g").append("text").attr('id', c.gid).attr('class', 'chart').text("Summary").attr("transform", "translate(0, 12)");

        // axis
        svg.append("g").attr("class", "x axis").attr("transform", "translate(" + scnf.l + "," + (scnf.height + scnf.margin) + ")").call(xAxis);
        svg.append("g").attr("class", "y axis").attr("transform", "translate(" + scnf.l + ", " + scnf.margin + ")").call(yAxis).append("text");

        // 類似した発現の遺伝子を表示
        get_gene_info(c.gid).then(function(r){show_heatmap(r)});
        //d3.json(`${refex_api}gene/${c.gid}`, function (e, d) {console.log(d);show_heatmap(d)});

        function show_heatmap(d){
            get_similar_gene(d).then(function(r){
                var heatmap = d3.select('.summary_list').append('div').attr('id', 'hm' + c.gid).attr('class', 'collapse hm');
                var tid = r[2]['id'], sym = r[2]['Symbol'];
                var n = r[2]['value'] == null ? r[2]['id']: r[2]['value'];
                summary_chart.append('div').attr('class', 'similar').html(`
                    Most similar expression: <span class="msg" data-target="${c.gid}"><a onclick="get_similar_info(${tid}, '${n}','${sym}');" href="#">${n}</a></span>
                    <button class="btn btn-primary btn-xs showmore" data-toggle="collapse" data-target="#hm${c.gid}">show more...</button>`);
                    // click eventを動的に追加する

                co.domain([d3.min(r[1]), d3.max(r[1])]);
                heatmap.append('div').attr('class', 'heatmap').html(`<h3>Expression similarity between ${d['Symbol']} and other genes.</h3>`);
                heatmap.append('svg').attr('class', 'heatmap').attr('width', hw).attr('height', hh)
                    .append('g').selectAll('rect').data(r[1])
                    .enter().append('rect')
                    .style('fill', function (d) {
                        return co(d)
                    })
                    .attr('x', function (d, i) {
                        return xpos(i)
                    })
                    .attr('y', function (d, i) {
                        return ypos(i)
                    })
                    .attr('width', gridw)
                    .attr('height', gridh)
                    .on('click', function (d, i) {
                        get_gene_info(glst[i]).then(function(r) {
                            var tid = r['id'], name = r['value'], sym = r['Symbol'];
                            get_similar_info(tid, name, sym);
                        });
                    });

                var lv = heatmap.append('svg').attr('width', hw + 50).attr('height', 32);
                var legend_view = lv.append('g').attr('class', 'legend_view').attr('transform', 'translate(0, 10)');
                var legend = d3.legendColor().orient('horizontal').shapeWidth(55).shapeHeight(8).shapePadding(60)
                    .labelAlign("start").labelFormat(d3.format(".02f")).labelDelimiter("-").on("cellclick", function(c){get_similar_gene_dump(r[1], c)});
                legend.scale(co);
                legend_view.call(legend);

                // create heatmap
            });
        }

        // クリックしたlegendのcellに該当するexession valueの範囲を取得し、その範囲に入るgene_idを取得。情報を表示する
        function get_similar_gene_dump(exp, c){
            // expression valueが選択した範囲のgene_idを取得する
            var ra = co.invertExtent(c);
            var gs = []; // gene_id list

            exp.forEach(function (d, i) {
                if ( d > ra[0] && d <= ra[1]) gs.push(glst[i]) ;
            });
            gs = gs.slice(0, 50); //表示するオブジェクトの最大数を設定
            // gs.length = 50の際にアラート


            var promises = [];
            for (var i in gs){
                var g = gs[i];
                promises.push(get_gene_info(g));
            }
            Promise.all(promises).then(function (responses) {
                var gids = []; //promises
                for (var i in responses){
                        var res = responses[i]; //gene_info object
                        var tid = res['id'], name = res['value'], sym = res['Symbol'];
                        get_refex_info_asyn(tid, name, sym); //この後の処理も非同期処理を含む
                    }
                });
        }

        function get_similar_gene(g) {
            return new Promise(function(resolve){
                var target_dst = refex_api + 'dist/'+ g['id'];
                d3.queue()
                    .defer(d3.text, './data/gene_list_human.txt')
                    .defer(d3.json, target_dst)
                    .await(function(error, g, d){
                        var dst = d['dist'];
                        xh.domain(g).range([...Array(g.length).keys()]); //遺伝子が何ピクセル目か変換するスケール
                        glst = g.split(','); //gene idのリスト
                        co.domain([d3.min(dst), d3.max(dst)]);
                        var index_max = dst.indexOf(Math.max.apply(null, dst)); // indexの取得
                        var g_max = glst[index_max]; // 最大値のid
                        get_gene_info(g_max).then(function(r){ resolve([g, dst, r]) });
                })
            })
        }

        function get_gene_info(i) {
            return new Promise(function(resolve){
                d3.json('./data/refex_gene_human.json', function(d){
                    var r = d.filter(function(obj){return (obj['id'] == i)});
                    resolve(r[0]);
                })
            });
        }
    }

    //選択した遺伝子の情報を選択リストg_infsに追加
    function add_to_list(d) {
        //リストに無いidか評価し、無ければobjectを追加
        (g_infs.map(function (c) { return c.gid }).indexOf(d.gid) == -1) ? g_infs.push(d) : "";

        tbl = d3.select("table.glist tbody").selectAll("tr").data(g_infs).enter().append("tr");

        tbl.append("td").attr('class', 'name').text(function (r) {return r.name});
        tbl.append("td").attr('class', 'symbol').text(function (r) {return r.symbol});
        tbl.append("td").attr('class', 'gid').text(function (r) {return r.gid});
        tbl.append("td").attr('class', 'organism').text(function (r) {return r.organism});
        tbl.append("td").attr('class', 'sort').html(function(r){
            if(g_infs.length == 1) return `<input type='radio' name='sort' value=${d.gid} checked='checked'>`;
            else return `<input type='radio' name='sort' value=${d.gid}>`
        })
        tbl.append("td").attr('class', 'rm').html(`<button type="button" class="btn btn-warning btn-xs">Remove from List <span class="glyphicon glyphicon-minus"></span></button>
        `)
            .on("click", function () {remove_from_list(d.gid)});

        if (!document.getElementById("lm")) show_learnmore_btn();
    }

    function rm_item(d) {
        delete r_infs[d.gid];
        d3.select('#gid' + d.gid + '.profile').remove();
        d3.select('#hm' + d.gid + '.hm').remove();
    }

    function remove_from_list(g) {
        //選択された情報をobjectから削除する
        g_infs = g_infs.filter(function (d) {
            return !(d.gid == g)
        });

        //tbl = tbl.data(g_infs).exit().remove();

        tbl = d3.select("table.glist tbody").selectAll("tr").data(g_infs);
        tbl.exit().remove()

        tbl.select('td.name').text(function(r){
            return r.name
        });
        tbl.select('td.symbol').text(function(r){
            return r.symbol
        });


        tbl.select("td.gid").text(function (r) {
            return r.gid
        });
        tbl.select("td.organism").text(function (r) {
            return r.organism
        });
        tbl.select("td.rm").html(`<button type="button" class="btn btn-warning btn-xs">Remove from List <span class="glyphicon glyphicon-minus"></span></button>`)
            .on("click", function (r) {
                remove_from_list(r.gid)
            });
        if(g_infs.length == 0) d3.select('.learnmore button').remove();
    }

    // "Learn more" button
    function show_learnmore_btn() {
        d3.select("table.glist th.more").append("div")
            .attr("class", "learnmore")
            .html(`<button id="lm" type="button" class="btn btn-primary btn-xs">Learn more  <span class="glyphicon glyphicon-stats"></span></button>`)
            .on("click", function () {
                learn_more(selected_ids())
            })
    }

    // listに加えられた遺伝子のid:arrayを
    function selected_ids() {
        //現在のlist中にあるgene_idを返す
        var g = g_infs.map(function (g) {
            return g.gid
        });
        return g
    }

    /*
     * 詳細チャート
     */
    function learn_more(gids) {
        //r_infsを、引数として受け取る選択された遺伝子のidリストでフィルターし、描画用の配列を生成する。
        // 配列はチャート生成関数に渡す。
        s_r_infs = [];
        gids.map(function (k) {
            return r_infs[k]
        }).forEach(function (d) {
            //s_r_infs.push(obj2d(d)) //gidを引数に含める必要があるのでオブジェクトに
            s_r_infs.push({info: d[0], val: obj2d(d)})
        });
        bbchart.chart(s_r_infs);
    }

    //d3.js用のデータに整形し返す。
    function obj2d(e) {
        //exp_val => d.value, sample => d.sampleにハッシュの値をmapし、ハッシュを返す。
        var i = e[1].map(function (d) {
            return {"value": d3.format(".3f")(+d['exp_val']), "sample": d.sample, "cat": d.cat, "refex": d.refex}
        });
        return i
    }

    // draw focus chart and context
    var bbchart = {
        types: {},
        config: {},
        //config: function(d){ return d == 1 ? 'isSingle' : 'isGrouped'}, // data.length
        chart: function (data) {
            type = this.config[data.length === 1 ? 1 : 2];
            this.types[type].chart(data);
        }
    };

    //typeと処理対象の設定
    bbchart.config = {
        1: 'isSingle',
        2: 'isGrouped'
    };

    bbchart.types.isSingle = {
        chart: function (data) {
            show_chart_view();
            reset_chart();
            var input_data = data[0]['val'];
            var n = input_data.map(function (d) {
                return d.refex
            });
            xa.domain(n);
            xg = xa;
            yb.domain([0, d3.max(input_data, function (d) {
                return d.value
            })]);
            xc.domain(n);
            yc.domain(yb.domain());

            // カテゴリごとfill colorを色分けするスケール
            colors.domain(d3.map(input_data, function (d) {
                return d.cat
            }).keys());
            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            legend.scale(colors);
            legend_view.call(legend);

            xAxisc.tickSize(0).tickValues('');

            focus.selectAll('.f_bar')
                .data(input_data)
                .enter().append('rect')
                .attr('class', 'f_bar')
                .style('fill', function (d) {
                    return colors(d.cat)
                })
                .attr('x', function (d) {
                    return xa(d.refex)
                })
                .attr('width', xa.bandwidth())
                .attr('y', function (d) {
                    return yb(d.value)
                })
                .attr('height', function (d) {
                    return bcnf.height - yb(d.value)
                })
                .on("mouseover", function (d) {
                    show_annotation(d.sample, d.refex, d.value, false)
                })
                .on('mouseout', function(d){
                    hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d.sample, d.refex, d.value)
                });
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,' + bcnf.height + ')').call(xAxisb);
            focus.append('g').attr('class', 'y-axis axis').call(yAxisb);

            context.append('g').selectAll('.c_bar').data(input_data)
                .enter().append('rect')
                .attr('class', 'c_bar')
                .attr('style', 'fill:#999999')
                .attr('x', function (d) {
                    return xc(d.refex)
                })
                .attr('width', xc.bandwidth())
                .attr('y', function (d) {
                    return yc(d.value)
                })
                .attr('height', function (d) {
                    return ccnf.h - yc(d.value)
                });

            context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc);

            gBrush = context.append('g').attr('class', 'brush')
                .call(brush);

            ctrl_view.append('g').attr('class', 'reset-obj bc-btn').append('text').attr('font-family', 'FontAwesome')
                .text('\uf036 sort')
                .on('click', function () {
                    sort_bars()
                });

            var symbol = [ d3.symbol().size(30).type(d3.symbolTriangleLeft), d3.symbol().size(30).type(d3.symbolTriangleRight)];
            gBrush.selectAll('.handle--custom')
                .data([{type: 'w'}, {type: 'e'}])
                .enter().append('g')
                .attr('class',  'handle--custom')
                .append('path')
                .attr('fill', '#444')
                .attr('fill-opacity', 0.8)
                .attr('stroke', '#444')
                .attr('stroke-width', 1.5)
                .attr('cursor', 'ew-resize')
                .attr('d', function(d, i){return symbol[i]()});

            gBrush.selectAll('.handle--custom')
                .append('line')
                .attr('y1', -(ccnf.h/2))
                .attr('y2', ccnf.h/2)
                .attr('x1', function(d, i){return i ? -2: 2})
                .attr('x2', function(d, i){return i ? -2: 2})
                .attr('stroke-width', 3)
                .attr('stroke', "#444");
            gBrush.call(brush.move, xc.range());

            show_gene_info(data[0]['info']);
        }
    };

    bbchart.types.isGrouped = {
        chart: function (data) {
            show_chart_view();
            reset_chart();
            // 遺伝子サンプルの長さの
            var g = data.map(function (d) {
                return {id: d['info']['gid'], symbol: d['info']['symbol']}
            });
            var k = g.map(function (d) {
                return d['id']
            });
            var input_data = data.map(function (d) {
                return d['val']
            });

            //var input_data = data[0]['val']; //objectの配列
            var n = input_data[0].map(function (d) {
                return d.sample
            });

            xa.domain(n);
            xg = xa;
            xz.domain([...Array(data.length).keys()]).range([0, xa.bandwidth()]);

            var exp_max = d3.max(input_data.map(function (d) {
                return d3.max(d, function (e) {
                    return +e.value
                })
            }));

            yb.domain([0, exp_max]);
            xc.domain(n);
            yc.domain(yb.domain());

            // 遺伝子ごとfill colorを色分けするスケール。ターゲット長の整数配列を引数に渡す
            sym = g.map(function (d) {
                return d.symbol
            });
            //colors.domain([...Array(data.length).keys()]);
            colors.domain(sym);
            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            legend.scale(colors);
            legend_view.call(legend);
            xAxisc.tickSize(0).tickValues('');

            focus.selectAll('g')
                .data(input_data[0])
                .enter().append('g')
                .attr('class', 'f_bar')
                .attr('transform', function (d) {
                    return 'translate(' + xa(d.sample) + ',0)'
                })
                .selectAll('rect')
                .data(function (d, i) {
                    return input_data.map(function (e) {
                        return e[i]
                    })
                })
                .enter().append('rect')
                .style('fill', function (d, i) {
                    return colors(sym[i])
                })
                .attr('class', function (d, i) {
                    return sym[i] + colors(sym[i])
                })
                .attr('x', function (d, i) {
                    return xz(i)
                })
                .attr('width', xz.bandwidth())
                .attr('y', function (d) {
                    return yb(d.value)
                })
                .attr('height', function (d) {
                    return bcnf.height - yb(d.value)
                })
                .on("mouseover", function (d) {
                    show_annotation(d.sample, d.refex, d.value, true)
                })
                .on('mouseout', function(){
                    hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d.sample, d.refex, d.value)
                });
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,' + bcnf.height + ')').call(xAxisb);
            focus.append('g').attr('class', 'y-axis axis').call(yAxisb);

            context.append('g').selectAll('g')
                .data(input_data[0])
                .enter().append('g')
                .attr('class', 'c_bar')
                .attr('transform', function (d) {
                    return 'translate(' + xa(d.sample) + ',0)'
                })
                .selectAll('rect')
                .data(function (d, i) {
                    return input_data.map(function (e) {
                        return e[i]
                    })
                })
                .enter().append('rect')
                .attr('style', 'fill:#999999')
                .attr('x', function (d, i) {
                    return xz(i)
                })
                .attr('width', xz.bandwidth())
                .attr('y', function (d) {
                    return yc(d.value)
                })
                .attr('height', function (d) {
                    return ccnf.h - yc(d.value)
                });

            context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc);

            gBrush = context.append('g').attr('class', 'brush')
                .call(g_brush);
                //.call(g_brush.move, xc.range());

            gBrush.selectAll('.handle--custom')
                .data([{type: 'w'}, {type: 'e'}])
                .enter().append('g')
                .attr('class',  'handle--custom')
                .append('path')
                .attr('fill', '#444')
                .attr('fill-opacity', 0.8)
                .attr('stroke', '#444')
                .attr('stroke-width', 1.5)
                .attr('cursor', 'ew-resize')
                .attr('d', function(d, i){return symbol[i]()});

            gBrush.selectAll('.handle--custom')
                .append('line')
                .attr('y1', -(ccnf.h/2))
                .attr('y2', ccnf.h/2)
                .attr('x1', function(d, i){return i ? -2: 2})
                .attr('x2', function(d, i){return i ? -2: 2})
                .attr('stroke-width', 3)
                .attr('stroke', "#444");
            gBrush.call(brush.move, xc.range());

            ctrl_view.append('g').attr('class', 'reset-obj bc-btn').append('text').attr('font-family', 'FontAwesome')
                .text('\uf036 sort')
                .on('click', function () {
                    sort_g_bars()
                });

            show_gene_info(data[0]['info'])
        }
    };

    function show_annotation(sample, ref, val, group) {
        var w = bcnf.width - (bcnf.l + bcnf.r);
        //var h = bcnf.height;
        // scaleの設定呼び出し基のscaleに合わせる
        var xann = xg;
        var anno_x = group ? xann(sample) : xann(ref);
        // annotationの設定
        labels = [{note: {title: "Sample: " + sample, label: "Expression value: " + val},
            dx: (function(){if (w - anno_x < 150)return -20; else return 20}()),
            dy: (function(){if (yb(val) < 20)return 10;else return -10}()),
            x:  anno_x,
            y: yb(val)}];

        makeAnnotations = d3.annotation()
            .annotations(labels)
            .type(d3.annotationCallout);

        // annotationをcall
        focus.append("g").attr('class', 'sample-annotation').call(makeAnnotations)
    }

    function hide_annotation() {
        focus.selectAll('.sample-annotation').remove();
    }

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return;
        //brunsh eventで選択された値かデフォルト値をsに
        var s = d3.event.selection || xa.range();

        //xsまたはxsをフィルターし、選択したレンジのドメイン生成
        var x = focus.sorted ? xs : xa;

        selected = x.domain()
            .filter(function (d, i) {
                return s[0] <= (a = (i + 1) * x.bandwidth()) && (a <= s[1])
                //range最小値とwidth*(i+1)を比較し最小値以上かつrange最大値とwidth*(i+2)を比較しrange最大値より小さい
            });
        xc.domain(selected);
        xg = xc;
        //x = xc;

        focus.select(".x-axis").call(xAxisb);
        focus.selectAll(".f_bar").transition().duration(250)
            .attr('x', function (d) {
                return xc(d.refex)
            })
            .attr('width', xc.bandwidth())
            .attr('name', function (d) {
                return (d.sample + ': ' + String(d.value))
            })
            .attr('y', function (d) {
                return yb(d.value)
            })
            .attr('height', function (d) {
                if (typeof(xc(d.refex)) === 'undefined') {
                    return 0
                } else {
                    return bcnf.height - yb(d.value)
                }
            });

        //handleの操作
        if (d3.event.selection) {
            gBrush.selectAll('.handle--custom').attr('display', null).attr("transform", function (d, i) {
                var g = i ? 2: -2;
                return "translate(" + (s[i] + g) + "," + ccnf.h / 2 + ")" ;
            });
        } else {
            gBrush.selectAll('.handle--custom').attr('display', 'none');
        }
    }

    function g_brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        //brunsh eventで選択された値かデフォルト値をsに
        var s = d3.event.selection || xa.range();

        //input_data[0]のsampleをx scaleとして初期化設定
        var x = xa;

        // range最小値以上のsampleからrange最大値より小さいsampleまでのdomainを返す
        selected = x.domain()
            .filter(function (d, i) {
                return s[0] <= (a = (i + 1) * x.bandwidth()) && (a <= s[1])
            });

        xc.domain(selected); // 選択されたsampleの配列をscale xのdomainとする
        xz.range([0, xc.bandwidth()]); //

        focus.select(".x-axis").call(xAxisb);

        focus.selectAll(".f_bar").transition().duration(250)
            .attr('transform', function (d) {
                if (typeof(xc(d.sample)) === 'undefined') {
                    return 'translate(0,0)'
                } else {
                    return 'translate(' + xc(d.sample) + ',0)'
                }
            })
            .selectAll('rect')
            .style('fill', function (d, i) {
                return colors(sym[i])
            })
            .attr('x', function (d, i) {
                return xz(i)
            })
            .attr('width', xz.bandwidth())
            .attr('y', function (d) {
                return yb(d.value)
            })
            .attr('height', function (d) {
                if (typeof(xc(d.sample)) === 'undefined') {
                    return 0
                } else {
                    return bcnf.height - yb(d.value)
                }
            });

        //handleの操作
        if (d3.event.selection) {
            gBrush.selectAll('.handle--custom').attr('display', null).attr("transform", function (d, i) {
                var g = i ? 2: -2;
                return "translate(" + (s[i] + g) + "," + ccnf.h / 2 + ")" ;
            });
        } else {
            gBrush.selectAll('.handle--custom').attr('display', 'none');
        }
    }

    function sort_bars() {
        context.selectAll('.axis').remove();
        context.selectAll('.brush').remove();

        // ターゲットとなる遺伝子のオブジェクトr_inf
        var data = s_r_infs[0]['val'];

        // expression valueでターゲット遺伝子の情報（r_inf）をソートする
        var data_sorted = data.sort(function (a, b) {
            return +b.value - +a.value
        }); //descending

        //ソートされたr_infからrefex idを取り出す
        var samples_sorted = data_sorted.map(function (d) {
            return d.refex
        });

        //u_data = Array.from(new Set(samples_sorted));
        /*
        var c = samples_sorted.filter(function (x, i, self) {
            return self.indexOf(x) !== self.lastIndexOf(x);
        });
        */

        // sort表示のXscaleの設定
        xs.domain(samples_sorted);

        focus.selectAll('.f_bar').transition().duration(500)
            .attr('x', function (d) {
                return xs(d.refex);
            })
            .attr('width', xs.bandwidth())
            .attr('y', function (d) {
                return yb(d.value);
            })
            .attr('height', function (d) {
                return bcnf.height - yb(d.value)
            })
            .style('fill', function (d) {
                return colors(d.cat)
            });

        focus.sorted = true;

        context.selectAll('.c_bar').transition().duration(500)
            .attr('x', function (d) {
                return xs(d.refex)
            })
            .attr('width', xc.bandwidth())
            .attr('y', function (d) {
                return yc(d.value)
            })
            .attr('height', function (d) {
                return ccnf.h - yc(d.value)
            });

        context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
            .call(xAxiss).selectAll('text').style("text-anchor", "end").attr("dx", "-.5em").attr("dy", "0.1em").attr("transform", "rotate(-90)");

        context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc);

        gBrush = context.append('g').attr('class', 'brush')
            .call(brush);

        gBrush.selectAll('.handle--custom')
            .data([{type: 'w'}, {type: 'e'}])
            .enter().append('g')
            .attr('class',  'handle--custom')
            .append('path')
            .attr('fill', '#444')
            .attr('fill-opacity', 0.8)
            .attr('stroke', '#444')
            .attr('stroke-width', 1.5)
            .attr('cursor', 'ew-resize')
            .attr('d', function(d, i){return symbol[i]()});

        gBrush.selectAll('.handle--custom')
            .append('line')
            .attr('y1', -(ccnf.h/2))
            .attr('y2', ccnf.h/2)
            .attr('x1', function(d, i){return i ? -2: 2})
            .attr('x2', function(d, i){return i ? -2: 2})
            .attr('stroke-width', 3)
            .attr('stroke', "#444");
        gBrush.call(brush.move, xc.range());
    }

    function sort_g_bars(){
        context.selectAll('.axis').remove();
        context.selectAll('.brush').remove();

        // sort keyとする遺伝子取得
        var kid = d3.select('input[name="sort"]:checked').node().value;

        // sort keyとして設定した遺伝子のexpression valueの配列を取得
        // s_r_infs.info.gidでフィルターし、Array.valを取得
        var data = s_r_infs.filter(function(obj){return String(obj['info']['gid']) === kid; });

        // dataをexpression valueでソート
        var data_sorted = data[0]['val'].sort(function (a, b) {
            return  +b.value - +a.value
        });

        //　ソートされたオブジェクトからsample idを取り出し配列にmap
        var sample_sorted = data_sorted.map(function(d){
            return d.sample
        });

        // sort表示のxscale設定
        xa.domain(sample_sorted);
        // 選択した遺伝子間のスケールxzは変更せずそのまま表示

        // update focus
        focus.selectAll('.f_bar').transition().duration(500)
                .attr('transform', function (d) {
                    return 'translate(' + xa(d.sample) + ',0)'
                });

        focus.sorted = true;

        // update context
        context.selectAll('.c_barg').selectAll('g')
            .attr('transform', function (d) {
                return 'translate(' + xa(d.sample) + ',0)'
            });

        context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc);

        gBrush = context.append('g').attr('class', 'brush')
            .call(g_brush);

        gBrush.selectAll('.handle--custom')
            .data([{type: 'w'}, {type: 'e'}])
            .enter().append('g')
            .attr('class',  'handle--custom')
            .append('path')
            .attr('fill', '#444')
            .attr('fill-opacity', 0.8)
            .attr('stroke', '#444')
            .attr('stroke-width', 1.5)
            .attr('cursor', 'ew-resize')
            .attr('d', function(d, i){return symbol[i]()});

        gBrush.selectAll('.handle--custom')
            .append('line')
            .attr('y1', -(ccnf.h/2))
            .attr('y2', ccnf.h/2)
            .attr('x1', function(d, i){return i ? -2: 2})
            .attr('x2', function(d, i){return i ? -2: 2})
            .attr('stroke-width', 3)
            .attr('stroke', "#444");
        gBrush.call(g_brush.move, xc.range());

    }

    function show_gene_info(inf) {
        d3.select("#barchart .gene_info").html("<h3>Feature:</h3> " + inf['symbol']);
    }

    function show_reference(sample, refx, eval) {
        var item = sample_ref[sample];
        if ($('#barchart .sample_ref div.ref').length) {
            d3.select('#barchart .sample_ref .ref').remove();
        }
        // show gene info
        d3.select("#barchart .sample_name").html("<h3>Sample:</h3> " + sample);
        d3.select("#barchart .refex_id").html("<h3>RefEx:</h3> " + refx);
        d3.select("#barchart .exp_val").html("<h3>Expression value:</h3> " + eval);

        // sample reference
        var ref = d3.select('#barchart .sample_ref').append('div').attr('class', 'ref');
        ref.append('div').html("<h3>Cell ontology:</h3> " + ar2str(item.cell));
        ref.append('div').html("<h3>Fantom5:</h3> " + ar2str(item.fantom));
        ref.append('div').html("<h3>Uberon anatomy ontology:</h3> " + ar2str(item.uberon));
        ref.append('div').html("<h3>Human Disease ontology:</h3> " + ar2str(item.disease));
    }

    // annotationに
    /*
    function show_info(name, ref, val) {}
    */

    function ar2str(x) {
        return x.join(', ');
    }

    // 詳細チャート描画エリアを確保（）bar,axisを初期化する
    function show_chart_view() {
        svg.transition().duration(100).attr('height', bcnf.height + bcnf.b + bcnf.t + ccnf.h + ccnf.b);
    }

    // bar, axis, brushを削除する
    function reset_chart() {
        focus.selectAll('.f_bar').remove();
        context.selectAll('.bar').remove();
        focus.selectAll('.axis').remove();
        context.selectAll('.c_bar').remove();
        context.selectAll('.axis').remove();
        context.selectAll('.brush').remove();
        legend_view.selectAll('.legendCells').remove();
        d3.selectAll('.reset-obj').remove();
        focus.sorted = false;
    }

    get_similar_info = function(g, n, s){
        gid = g;
        org = $("[name=orgs]:checked").val();
        ginf = {gid: gid, name: n, symbol: s, organism: org};
        if(!r_infs[gid]) get_refex_info(gid);
    };

    /*
     * UIイベント定義
     */
    var th = $('#refex .typeahead').typeahead(null, {
        name: 'gene_info',
        limit: 20,
        display: 'value',
        templates:{
              empty:'input gene name, id, or official symobo',
              suggestion: Handlebars.compile('<div>Name: {{value}} ,Symbol: {{Symbol}} ,ID: {{id}}</div>')
            },
        source: gene_info_human.ttAdapter()
    });

    // typeahead('destroy')して、sourceにbloodhound objを指定し再定義
    function change_source(g) {
        var target = eval('gene_info_' + g);
        th.typeahead('destroy');
        th.typeahead(null, {
            name: 'gine_info',
            limit: 20,
            display: 'value',
            templates:{
              empty:'input gene name, id, or official symobo'
            },
            source: target.ttAdapter()
        })
    }

    // radio buttonのイベント
    $('input').on('ifChecked', function (e) {
        change_source(this.value)
    }).iCheck({
        checkboxClass: 'icheckbox_flat-blue',
        radioClass: 'iradio_flat-blue'
    });


    //選択した遺伝子の情報を取得し、idを引数に検索メソッドをcall
    $('#refex .typeahead').bind('typeahead:select', function (e, suggestion) {
        gid = suggestion.id;
        org = $("[name=orgs]:checked").val();
        ginf = {gid: gid, name: this.value, symbol: suggestion.Symbol, organism: org};
        if(!r_infs[gid]) get_refex_info(gid);
    });

    $("#sort_bbchart").click(function () {
        sort_bars()
    });



})();