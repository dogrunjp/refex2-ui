//chart.js 0.2.3 20190729
// lolipop chart
// 複数遺伝子の比較をcircleでプロットする
(function () {
    get_all_sample();

    function getUrlParams() {
        var params = location.search.substring(1);
        var obj = JSON.parse('{"' + decodeURI(params).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
        return obj
    }

    var gid = getUrlParams().gid;
    // gidに対応する、symbol, name, organismを取得してginfを設定

    var ginf = {}; ////

    get_refex_info(gid);

    // get_refex_info完了しデータを取得したのち実行する
    function get_refex_info_done() {
        store_data(ginf, r_inf);
        // chart描画
        learn_more([gid])
        // feature tag 更新
        obs.trigger("geneinfoLoaded", ginf)
    }

    var container_width = document.getElementById('barchart').offsetWidth,
        //container_width = 800,
        ginf, //検索キーとするgene idとプロパティのオブジェクト
        g_infs = [], //ポートフォリオとして保持するデータ
        r_inf, //refex_idに紐づくデータデータセット.integbioから取得
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
        tbl,
        //scnf = {width: 600, height: 40, margin: 30, b: 40, l: 20, r: 50},
        // focus & context chart confs チャート描画部分
        bcnf = {width: (container_width - 550), height: 1500, hide: 0, margin: 30, t: 60, b: 35, l: 100, r: 175},
        ccnf = {h: 40, t: 8, b: 30},
        yg, // globalyscale
        ya = d3.scaleBand().range([0, bcnf.height - (bcnf.t + bcnf.b)]), // x scale for focused chart
        xb = d3.scaleLinear().range([0, bcnf.width]),
        yc = d3.scaleBand().range([0, bcnf.height - (bcnf.t + bcnf.b)]), // x scale for context chart
        xc = d3.scaleLinear().range([ccnf.h, 0]),
        // sort用スケール
        ys = d3.scaleBand().range([0, bcnf.height - (bcnf.t + bcnf.b)]),  // x scale for sorted chart
        //xz = d3.scaleBand().padding(0.05);
        yz = d3.scaleBand(),
        sym = [],
        gBrush,
        makeAnnotations,
        labels,
        hcnf = {top: 50, right: 0, bottom: 100, left: 30},
        hw = 1020,
        hh = 740,
        //gridw = 4, heatmapの属性
        //gridh = 10, heatmapの属性
        ranking_w = 400,
        ranking_h = 250,
        // gene_idのリスト。序数を渡すとidが変える。
        glst;

    // barchartを描画するsvgの設定。
    var svg = d3.select('#barchart .chart').append('svg').attr('class', 'bar_chart')
        .attr('width', bcnf.width + bcnf.l + bcnf.r).attr('height', (bcnf.hide));

    var focus = svg.append('g').attr('class', 'focus').attr('transform', 'translate(' + bcnf.l + ',' + bcnf.t + ')');
    var context = svg.append('g').attr('class', 'context').attr('transform', 'translate(' + bcnf.l + ',' + ( +bcnf.height + +bcnf.t + ccnf.t) + ')');


    // 凡例
    var legend_view = svg.append('g').attr('class', 'legend_view').attr('transform', 'translate(0, 0)');

    var bbchart_info = d3.select('#barchart .info').append('div').attr('class', 'bbchart_info').attr('y', -30)
        .attr('width', 10).attr('style', 'left:' + bcnf.width);

    var brush = d3.brushX()
        .extent([[0, 0], [bcnf.width - bcnf.l, ccnf.h]])
        .on("brush end", brushed);

    var g_brush = d3.brushX()
        .extent([[0, 0], [bcnf.width - bcnf.l, ccnf.h]])
        .on("brush end", g_brushed);

    var yAxis = d3.axisLeft(ya),
        //xAxisc = d3.axisBottom(xc).tickSize(2).tickValues(xc.domain().filter(function(d,i){return (i % 20) == 0})).tickFormat(function (d) {return d.slice(-4)}),
        xAxisc = d3.axisTop(xb).ticks(3).tickSize(-bcnf.height + (bcnf.t + bcnf.b)).tickFormat(d3.format("d")),
        xAxis_bottom = d3.axisBottom(xb).ticks('');
        //yAxisb = d3.axisBottom(ya).tickSize(0).tickFormat('');

    // heatmap confs
    var heatmap = d3.select("#map").append("svg")
        .attr("width", hw + hcnf.left + hcnf.right)
        .attr("height", hh + hcnf.top + hcnf.bottom)
        .append("g")
        .attr("transform", "translate(" + hcnf.left + "," + hcnf.top + ")");

    var xh = d3.scaleOrdinal(), //
    //colnum = Math.floor(hw / gridw),  //jsには整数型がないため整数を切り捨てして返すためにはMath.floorを使う
    xpos = function (i) {return i % colnum * gridw},
    ypos = function (i) {return (Math.floor(i / colnum)) * gridh},
    //gradient = ["#444466", "555599", "#6363FF", "#6373FF", "#63A3FF", "#63E3FF", "#63FFFB", "#63FFCB",
    //    "#63FF9B", "#7BFF63", "#BBFF63", "#DBFF63", "#EEFF63", "#FFFF66", "#FFD363", "#FFB363", "#FF6364"],

    // coはheatmapのためのカラースケール。不要。
    gradient = ["#ffffff","#ffffff","#b8d1e6","#b8d1e6","#8abce6","#8abce6","#73b2e6","#5ca8e6","#2e93e6","#0064b5"],
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

    // 選択した遺伝子のgene idでrefexの情報を取得 << 関数定義に
    /*
    get_refex_info =　function(gid) {
            var u = refex_cash_api + gid;
            $.getJSON(u)
                .success(function (d) {
                    r_inf = d["r_inf"];
                    ginf = d["ginf"];
                })
                .error(function () {
                    var qs = encodeURIComponent(query_refex_info(gid));
                    var q = endpoint + "?query=" + qs;

                    // d3.xmlで直接rdf portalを叩く場合
                    d3.xml(q, function (error, xmlRoot) {
                        r_inf = Array.from(xmlRoot.querySelectorAll('result'), function (x) {
                            return x2obj(x)
                        });
                        //summary_chart(ginf, summary_data(r_inf));
                        store_data(ginf, r_inf);
                    })
                })
    };*/

    //一括描画のための関数。<< L:351
    get_refex_info_asyn =　function(g, n, s) {
          var infs = {};
        orgs = $("[name=orgs]:checked").val();
        infs[g] = {gid: g, name: n, symbol: s, organism: org};
        var u = refex_cash_api + g;
        var gid = g;
        if(!r_infs[g]) {
            $.getJSON(u)
                .success(function (d) {
                    // sampleごとの発現量が返る
                    r_inf = d["r_inf"];
                    summary_chart(infs[g], r_inf, gid);
                    store_data(infs[g], d)
                })
                .error(function () {
                    var qs = encodeURIComponent(query_refex_info(g));
                    var q = endpoint + "?query=" + qs;
                    d3.xml(q, function (error, xmlRoot) {
                        r_inf = Array.from(xmlRoot.querySelectorAll('result'), function (x) {
                            return x2obj(x)
                        });
                        summary_chart(infs[g],r_inf, g);
                        store_data(infs[g], r_inf);
                    })
                })


        }};

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
        item['desc'] = x.querySelectorAll('[name=description]').item(0).textContent;
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

    // イベントのバインド
    $("#show_similar_gene").click(function(){
        hide_annotation()
        showSimilarGene()
    });



    function get_screened_gene_dump(gs){
        gs = gs.slice(0, 50); //表示するオブジェクトの最大数を設定
        // gs.length = 50の際にアラート

        var promises = [];
        for (var i in gs){
            var g = gs[i];
            promises.push(get_gene_info(g));
        }
        // promisesが解決された際の処理
        Promise.all(promises).then(function (responses) {
            var gids = []; //promises
            for (var i in responses){
                    var res = responses[i]; //gene_info object
                    var tid = res['id'], name = res['value'], sym = res['Symbol'];
                    get_refex_info_asyn(tid, name, sym); //この後の処理も非同期処理を含む
                }
            });
    }
    // v2追加、gene_infosをオブジェクトとして一度だけ読み込んで置く
    function get_gene_infos(i) {
        return refex_gene_human.filter(function (d) {
            return d.id == i
        })
    }

    function get_gene_info(is) {
        // refex_gene_xx.jsonをから必要な遺伝子の情報のみ返すが、なんども呼ばれることが多いため、プロセスの改修が必要。
        // is:list of gene ids の処理として
        return new Promise(function(resolve){
            d3.json('./data/refex_gene_human.json', function(d){
                var r = d.filter(function(obj){return (is.indexOf(obj['id']) >= 0)});
                resolve(r);
            })
        });
    }

    //選択した遺伝子の情報を選択リストg_infsに追加
    function add_to_list(d) {
        $(".portfolio").css("display", "block");
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

        if(g_infs.length == 0){$(".portfolio").css("display", "none");}

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
        //s_r_infs = [];

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
            return {"value": d3.format(".3f")(+d['exp_val']), "sample": d.sample, "cat": d.cat, "refex": d.refex, "desc":d.desc}
        });
        return i
    }

    // draw focus chart and context
    var bbchart = {
        types: {},
        config: {},
        //config: function(d){ return d == 1 ? 'isSingle' : 'isGrouped'}, // data.length
        chart: function (data) {
            //bbchart
            type = this.config[data.length === 1 ? 1 : 2];
            this.types[type].chart(data);
        }
    };

    //typeと処理対象の設定
    bbchart.config = {
        1: 'isSingle',
        2: 'isGrouped'
    };

    // lolipop chart描画（遺伝子一つの場合）
    bbchart.types.isSingle = {
        chart: function (data) {
            // この処理は描画エリアを確保する処理だが、初めから表示しておいてよいかも
            show_chart_view();
            reset_chart();
            // [{value, sample, cat, desc} ]形式のデータに整形
            var input_data = data[0]['val'];
            var n = input_data.map(function (d) {
                return d.refex
            });
            //
            ya.domain(n);
            yg = ya;
            // x軸のスケールに発現値の最大値を渡してドメインを定義
            var xb_max = d3.max(input_data, function (d) {
                return +d.value
            });

            xb.domain([0, xb_max]);
            yc.domain(n);
            xc.domain(xb.domain());

            // カテゴリごとfill colorを色分けするスケール
            colors.domain(d3.map(input_data, function (d) {
                return d.cat
            }).keys());
            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            legend.scale(colors);
            legend_view.call(legend);

            yAxis.tickSize(1).tickValues( ya.domain().filter( function(d,i){ return !(i % 10); }))

            focus.selectAll('.f_line')
                .data(input_data)
                .enter().append('line')
                .attr('class', 'f_line')
                .style('stroke', function (d) {
                    return colors(d.cat)
                })
                .attr('y1', function (d) {
                    return ya(d.refex)
                })
                .attr('y2', function (d) {
                    return ya(d.refex)
                })
                .attr('x1', 0)
                .attr('x2', function (d) {
                    return xb(d.value)
                })
                .on("mouseover", function (d) {
                    show_annotation(d.sample, d.refex, d.value, d.desc, false)
                })
                .on('mouseout', function(d){
                    hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d.sample, d.refex, d.value, d.desc)
                });

            focus.selectAll('.f_circle')
                .data(input_data)
                .enter().append('circle')
                .attr('class', 'f_circle')
                .style('fill', function (d) {
                    return colors(d.cat)
                })
                .attr('cx', function (d) {
                    return xb(d.value)
                })
                .attr('cy', function (d) {
                    return ya(d.refex)
                })
                .attr('r', '3')
                .on("mouseover", function (d) {
                    hide_annotation()
                    show_annotation(d.sample, d.refex, d.value, d.desc, false)
                })
                .on('mouseout', function(d){
                    //hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d.sample, d.refex, d.value, d.desc)
                });


            var yaxis_padding = bcnf.height - (bcnf.t + bcnf.b);
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,0)' ).call(xAxisc);
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,' + yaxis_padding  + ' )').call(xAxis_bottom);
            focus.append('g').attr('class', 'y-axis axis').call(yAxis);


            $("#sort_bar")
                .on('click', function () {
                    hide_annotation()
                    sort_bars()
            });


            /* context を一時的に描画しない
            // context(brush area)描画
            context.append('g').selectAll('.c_bar').data(input_data)
                .enter().append('rect')
                .attr('class', 'c_bar')
                .attr('style', 'fill:#999999')
                .attr('x', function (d) {
                    return xb(d.value)
                })
                .attr('width', function (d) {
                    return xc(d.value)
                })
                .attr('y', function (d) {
                    return ya(d.refex)
                })
                .attr('height', function (d) {
                    return ya.bandwidth()
                });

            context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc);

             */

            // brushを一時的に描画しない
            /*
            gBrush = context.append('g').attr('class', 'brush')
                .call(brush);



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

            */

            show_gene_info(data[0]['info']);
        }
    };

    // barchart描画（複数の遺伝子を描画）
    bbchart.types.isGrouped = {
        chart: function (data) {
            //[{info: 遺伝子の情報のobject, val: 発現値のarray}]のデータがわたされる
            show_chart_view();
            reset_chart();
            /* 遺伝子サンプルの長さの
            var g = data.map(function (d) {
                return {id: d['info']['id'], symbol: d['info']['symbol']}
            });
            // 必要ないのでは？
            var k = g.map(function (d) {
                return d['id']
            });
            */
            // 比較する2遺伝子のデータ{info, val}から発現値を含むobjectのみ取り出し
            // list of dict を出力する
            // infoは対象となる遺伝子の情報
            var data_set = data.map(function (d) {
                return (d['info']['symbol'], d['val'])
            });

            //dict(value, sample, cat, refex des)のobjectのリストをzipする
            var input_data = d3.zip(data_set[0], data_set[1]);

            //sampleのlistを生成
            var n = input_data.map(function (d) {
                return d[0].sample
            });

            ya.domain(n);
            yg = ya;
            // グループ内の位置。0.2.1よりドットをプロットするので考慮しない実際のxの値を考慮するだけ。
            //xz.domain([...Array(data.length).keys()]).range([0, xa.bandwidth()]);

            var exp_max = d3.max(input_data.map(function (d) {
                // 二つのオブジェクトのvalueの値から大きい方の値を返す
                return Math.max(+d[0].value,+d[1].value)
            }));

            xb.domain([0, exp_max]);
            yc.domain(n);
            xc.domain(xb.domain());

            // 遺伝子ごとfill colorを色分けするスケール。ターゲット長の整数配列を引数に渡す
            var gene_name = data.map(function (d, i) {
                return d['info']['symbol']
            });
            //colors.domain([...Array(data.length).keys()]);
            colors.domain(gene_name);
            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            //d3-legendにスケールを渡す
            legend.scale(colors).on('cellclick', function(d){
                // d: symbol
                var res = s_r_infs.filter(function(e){
                    return e['info']['symbol'] == d
                })
                // legendのidを取得
                var target_id = res[0]['info']['id']
                var current_path = location.protocol + '//' + location.host + location.pathname
                window.open(current_path + "?gid=" + target_id)
            });

            legend_view.call(legend);
            yAxis.tickSize(1).tickValues( ya.domain().filter( function(d,i){ return !(i % 10); }));

           focus.selectAll('line')
                .data(input_data)
                .enter().append('line')
                .attr('class', 'f_lines')
                .style('stroke', function (d) {
                    return "#999999"
                })
                .attr('y1', function (d) {
                    return ya(d[0].sample)
                })
                .attr('y2', function (d) {
                    return ya(d[1].sample)
                })
                .attr('x1', function (d) {
                    return xb(+d[0].value)
                })
                .attr('x2', function (d) {
                    return xb(+d[1].value)
                })
                .on("mouseover", function (d) {
                    hide_annotation();
                    show_annotation(d[0].sample, d[0].refex, d[0].value, d[0].desc, false)
                })
                .on('mouseout', function(d){
                    //hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d[0].sample, d[0].refex, d[0].value, d[0].desc)
                });

            focus.selectAll('.f_circl_0')
                .data(input_data)
                .enter().append('circle')
                .attr('class', 'f_circle_0')
                .attr('r', '3')
                .style('fill', function () {
                    return colors(gene_name[0])
                })
                .attr('cx', function (d) {
                    return xb(+d[0].value)
                })
                .attr('cy', function (d) {
                    return ya(d[0].sample)
                })
                .on("mouseover", function (d) {
                    hide_annotation()
                    show_annotation(d[0].sample, d[0].refex, d[0].value, d[0].desc, true)
                })
                .on("mouseout", function(){
                    //hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d[0].sample, d[0].refex, d[0].value, d[0].desc)
                });

            focus.selectAll('.f_circle_1')
                .data(input_data)
                .enter().append('circle')
                .attr('class', 'f_circle_1')
                .attr('r', '3')
                // gene_name をcolorsに渡す
                .style('fill', function () {
                    return colors(gene_name[1])
                })
                .attr('cx', function (d) {
                    return xb(+d[1].value)
                })
                .attr('cy', function (d) {
                    return ya(d[1].sample)
                })
                .on("mouseover", function (d) {
                    hide_annotation()
                    show_annotation(d[1].sample, d[1].refex, d[1].value, d[1].desc, true)
                })
                .on("mouseout", function(){
                    //hide_annotation()
                })
                .on("click", function (d) {
                    show_reference(d[1].sample, d[1].refex, d[1].value, d[1].desc)
                });

            var yaxis_padding = bcnf.height - (bcnf.t + bcnf.b);
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,0)' ).call(xAxisc);
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,' + yaxis_padding  + ' )').call(xAxis_bottom);
            focus.append('g').attr('class', 'y-axis axis').call(yAxis);

            show_gene_info(data[0]['info'])

        }
    };

    function show_annotation(sample, ref, val, dsc, group) {
        var w = bcnf.width - (bcnf.l + bcnf.r);
        //var h = bcnf.height;
        // scaleの設定呼び出し基のscaleに合わせる
        // yスケールに入るのがRFXとRFSとわかれる
        // 通常のスケールはyc、ソートする場合はスケールはys
        var yann = focus.sorted ? ys : yc;
        //
        var anno_y = group ? yann(sample) : yann(ref);
        // annotationの設定
        labels = [{
            note: {title: sample + ":" , label: dsc + ", " + "Expression value: " + val},
            // position of notes
            dx: 50,
            dy: 20,
            // position of end of connector
            x:  xb(val),
            // yannにsampleまたはrefexの値を渡す
            y: anno_y
        }];

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
        var x = focus.sorted ? ys : ya;

        selected = x.domain()
            .filter(function (d, i) {
                return s[0] <= (a = (i + 1) * x.bandwidth()) && (a <= s[1])
                //range最小値とwidth*(i+1)を比較し最小値以上かつrange最大値とwidth*(i+2)を比較しrange最大値より小さい
            });
        xc.domain(selected);
        xg = xc;
        //x = xc;

        focus.select(".x-axis").call(yAxisb);
        focus.selectAll(".f_bar").transition().duration(250)
            .attr('x', 0)
            .attr('width', function (d) {
                if (typeof(yc(d.refex)) === 'undefined') {
                    return 0
                } else {
                    return xb(d.value)
                }
            })
            .attr('name', function (d) {
                return (d.sample + ': ' + String(d.value))
            })
            .attr('y', function (d) {
                return ya(d.value)
            })
            .attr('height', function (d) {
                if (typeof(xc(d.refex)) === 'undefined') {
                    return 0
                } else {
                    return ya.bandwidth()

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
        //context.selectAll('.axis').remove();
        //context.selectAll('.brush').remove();

        // case isSingle
        if(s_r_infs.length == 1){
            // ターゲットとなる遺伝子のオブジェクトr_infを取り出す
            var data = s_r_infs[0]['val'];
            // expression valueでターゲット遺伝子の情報（r_inf）をソートする
            var data_sorted = data.sort(function (a, b) {
                return +b.value - +a.value
            }); //descending
            //ソートされたr_infからrefex idを取り出す
            var samples_sorted = data_sorted.map(function (d) {
                return d.refex
            });

            // sort表示のy scaleの設定
            ys.domain(samples_sorted);

            focus.selectAll('.f_line').transition().duration(500)
                .attr('y1', function (d) {
                        return ys(d.refex)
                    })
                    .attr('y2', function (d) {
                        return ys(d.refex)
                    })
                    .attr('x1', 0)
                    .attr('x2', function (d) {
                        return xb(d.value)
                    });

            focus.selectAll('.f_circle').transition().duration(500)
                .attr('cx', function (d) {
                        return xb(d.value)
                    })
                    .attr('cy', function (d) {
                        return ys(d.refex)
                    })
                    .attr('r', '3');

        }else{
            // case isGrouped
            // focus.grouped = Trueの場合のscaleは
            // 二つのサンプルのvalueの差で遺伝子情報オブジェクト（r_inf）をソートする
            var data = s_r_infs;

            // 比較する2遺伝子のデータ{info, val}から発現値を含むobjectのみ取り出す
            var data_set = data.map(function (e) {
                    return (e['info']['symbol'], e['val'])
            });

            //dict(value, sample, cat, refex des)のobjectのリストをzipする
            // [[object0, object1],,]にzipされる
            var input_data = d3.zip(data_set[0], data_set[1]);

            // data_set[0]のvalueとdata_set[1]のvalueの差をsort
            var data_sorted = input_data.sort(function(a, b){
                return Math.abs(+b[0].value - +b[1].value) - Math.abs(+a[0].value - +a[1].value)
            });

            //ソートされたsampleのlistを生成[0][1]とも同じsampleなので[0]のみ渡す
            var sample_diff_sorted = input_data.map(function (d) {
                return d[0].sample
            });

            // ordinalscaleのyscaleを生成。ドメインにソートしたsampleを渡す
            ys.domain(sample_diff_sorted)


            focus.selectAll('.f_lines').transition().duration(500)
                    .attr('y1', function (d) {
                        return ys(d[0].sample)
                    })
                    .attr('y2', function (d) {
                        return ys(d[1].sample)
                    })
                    .attr('x1', function (d) {
                        return xb(d[0].value)
                    })
                    .attr('x2', function (d) {
                        return xb(d[1].value)
                    });

                focus.selectAll('.f_circle_0').transition().duration(500)
                    .attr('cx', function (d) {
                        return xb(d[0].value)
                    })
                    .attr('cy', function (d) {
                        return ys(d[0].sample)
                    });

                focus.selectAll('.f_circle_1').transition().duration(500)
                    .attr('cx', function (d) {
                        return xb(d[1].value)
                    })
                    .attr('cy', function (d) {
                        return ys(d[1].sample)
                    });
        }



        // focus chartのsortedフラグ
        focus.sorted = true;

        /*
        context.selectAll('.c_bar').transition().duration(500)
            .attr('x', function (d) {
                return ys(d.refex)
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

        */
    }

    function show_gene_info(inf) {
        d3.select("#barchart .gene_info").html("<h3>Feature:</h3> " + inf['symbol']);
    }

    function show_reference(sample, refx, eval, desc) {
        var item = sample_ref[sample];
        if ($('#barchart .sample_ref div.ref').length) {
            d3.select('#barchart .sample_ref .ref').remove();
        }
        // show gene info
        d3.select("#barchart .description").html("<h3>Description:</h3> " + desc);
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
        focus.selectAll('.f_line').remove();
        focus.selectAll('.f_circle').remove();
        focus.selectAll('.f_circle_0').remove();
        focus.selectAll('.f_circle_1').remove();
        context.selectAll('.bar').remove();
        focus.selectAll('.axis').remove();
        context.selectAll('.c_bar').remove();
        context.selectAll('.axis').remove();
        context.selectAll('.brush').remove();
        legend_view.selectAll('.legendCells').remove();
        d3.selectAll('.reset-obj').remove();
        focus.sorted = false;
    }

    //取得したオブジェクトを一時保存する
    function store_data(c, d) {
        // ginf, r_infを引数に
        // {gid: gid, array:[gin, r_inf]をr_infsに定義する
        var i = c.id;
        var a = [c, d];
        r_infs[i] = a;
    }

    get_similar_info = function(g, n, s){
        gid = g;
        org = $("[name=orgs]:checked").val();
        ginf = {gid: gid, name: n, symbol: s, organism: org};
        if(!r_infs[gid]) get_refex_info(gid);
        $("#similargenes").modal('hide');
    };


    // 選択した遺伝子のgene idでrefexの情報を取得
    function get_refex_info(gid) {
        return new Promise(function (resolve, refect) {
            var u = refex_cash_api + gid;
            $.getJSON(u)
                .success(function (d) {
                    r_inf = d["r_inf"];
                    ginf = d["ginf"];
                    get_refex_info_done();
                })
        })
    }

    // ver 0.2.1以降 追加

    // 入力したgidとの類似度を取得し、類似度の高い遺伝子３位までのgidを取得する
    function get_similar_gene() {
        return new Promise(function(resolve){
            var target_dst = refex_api + 'similarity/'+ gid;
            d3.queue()
                .defer(d3.text, './data/gene_list_human.txt')
                .defer(d3.json, target_dst)
                .await(function(error, g, d){
                    var dst = d['dist'];
                    xh.domain(g).range([...Array(g.length).keys()]); //遺伝子が何番目か（何ピクセル目か変換するスケール
                    glst = g.split(','); //gene idのリスト
                    co.domain([d3.min(dst), d3.max(dst)]);
                    var index_max = dst.indexOf(Math.max.apply(null, dst)); // 配列中の最大値を取得し、そのindexを取得する
                    var index_max_2 = secondMax(dst, index_max);
                    var index_max_3 = thirdMax(dst, index_max, index_max_2);
                    var ranking = [];
                    // top3のindexをgene idのリストに当ててgene_idに変換する
                    var gene_list = [index_max, index_max_2, index_max_3].map(function (i) {
                        return glst[i]
                    });

                    resolve(gene_list)
                })

        })
    }

    function secondMax(arr, i) {
        arr[i] = 0;
        var index_max = arr.indexOf(Math.max.apply(null, arr));
        return index_max
    }

    function thirdMax(arr, i, j) {
        arr[i] = 0;
        arr[j] = 0;
        var index_max = arr.indexOf(Math.max.apply(null, arr));
        return index_max
    }

    // 発現が類似する遺伝子を表示する
    // 遺伝子の選択操作はgroup viewの表示のトリガとする
    function showSimilarGene(){
        // feature gene : gid
        // 遺伝子類似度データを読み込む
        var gene_list = []
        get_similar_gene()
            .then(function (value) {
                return value
            })
            .then(function(lst){
                get_gene_info(lst)
                    .then(function(info){
                        obs.trigger("similarGeneLoaded", info)
                    })
            });

        // モーダルウィンドウに遺伝子名を書き出し、モーダルウィンドウを表示する
        $("#similargenes").modal();
        //$("#ps_screener").modal()
    }



    // 二つの遺伝子の発現をチャートに表示するgroup viewを呼ぶ
    function showGroupChart(i,j){
        // 発現値を読み込む


    }




})();

