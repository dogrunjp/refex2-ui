// table_with_cahrt.js 0.1.0 20190731
// refexの情報をtableとtable内chartに描画

(function(){
    //get_all_sample();
    // データを格納する変数
    var r_inf, r_infs={}, ginf, s_r_infs=[],tmp_max = 12, default_domain = [0, 12],
        chart_cols = ["description", "sample type","value"], group_cols = ["description", "sample type", "value"],
        arranged_data = [],gene_names = [], sample_data = [],
        default_legend = "sample";
    // チャートの状態
    var sorted = false, grouped = false, ppty="value";
    // チャート描画のためのパラメータ
    var cell_w = 250, cell_h = 20, cell_padding_l = 10, cell_padding_r = 100,  cell_padding_tb = 2,
        colors = d3.scaleOrdinal().range(["steelblue", "tomato", "yellowgreen", "Navy", "orange", "maroon", "olive"]),
        symbol = [ d3.symbol().size(30).type(d3.symbolTriangleLeft), d3.symbol().size(30).type(d3.symbolTriangleRight)];

    var scalex = d3.scaleLinear();

    function getUrlParams() {
        var params = location.search.substring(1);
        var obj = JSON.parse('{"' + decodeURI(params).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
        return obj
    }

    // 類似する遺伝子の情報を表示
    column_list_changed = function (l){
        chart_cols = l;
        console.log(l)
        learn_more([gid])
    }

    var gid = getUrlParams().gid;
    // gidに対応する、symbol, name, organismを取得してginfを設定

    get_refex_info(gid);

    // get_refex_info完了しデータを取得したのち実行する
    function get_refex_info_done() {
        obs.trigger("geneinfoLoaded", ginf);
        // s_r_infsを更新する
        store_data(ginf, r_inf);
        // chart描画
        learn_more([gid]);
        // 比較する遺伝子を読み込んだ婆愛、ヘッダの情報を書き換える
        if(grouped == true){
            var sample_info = s_r_infs[1]["info"]["symbol"];
            state_changed("and", sample_info);
        }
    }

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

    // チャートの状態を変更した際ヘッダの情報を書き換える
    function state_changed(s, g){
        var obj = {"state": s, "genes": g};
        obs.trigger("chartstateChanged", obj)
    }

    //取得したオブジェクトを一時保存する
    function store_data(c, d) {
        // ginf, r_infを引数に
        // {gid: gid, array:[gin, r_inf]をr_infsに定義する
        var i = c.id;
        var a = [c, d];
        r_infs[i] = a;
    }

    function learn_more(gid) {
        var info =  r_infs[gid];
        // obj2dでchart描画用のデータに変換
        // gidがs_r_infsに二重に登録されない場合はr_infをpushする
        if(s_r_infs.length == 0 || s_r_infs[0]["info"]["id"] != gid){
            s_r_infs.push({info: info[0], val: obj2d(info)});
        }
        bbchart.chart(s_r_infs);
    }

    //d3.js用のデータに整形し返す
    function obj2d(e) {
        //exp_val => d.value, sample => d.sampleにハッシュの値をmapし、ハッシュを返す。
        var i = e[1].map(function (d) {
            return {"value": d3.format(".3f")(+d['log2_Mean']), "sample": d.RefEx_Sample_ID,
                "sample type": d["Sample types category"],"experiment":"Experiments category",
                "refex": d.RefEx_ID, "description":d.description, "UBERON": d["UBERON label"],
                "CL": d["CL label"], "NCIT": d["NCIT label"], "stage": d["Developmental stage"]}
        });
        return i
    }

    // 描画
    var twc = d3.select("#barchart .chart");
    var table = twc.append("table").attr("class","sample_list table table-striped table-sm").attr("id", "refex_table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");


    // 凡例
    var legends = d3.select("#legends").append("svg").attr("width", "500px").attr("height", "40px");
    var legend_view = legends.append('g').attr('class', 'legend_view').attr('transform', 'translate(0, 2)');

    var sample_info_rows;

    // theadにcolnameとxaxis（& label）を表示する
    var chart_header = thead.append("tr").attr("height", 40);


    var bbchart = {
        types: {},
        config: {},
        chart: function(data){
            var type = this.config[data.length === 1 ? 1 : 2];
            this.types[type].chart(data)
        }
    };
    bbchart.config = {
        1: 'isSingle',
        2: 'isGrouped'
    };

    bbchart.types.isSingle = {
        chart: function(data){
            reset_chart()
            // d3.jsに渡す前に表示したい項目のみデータをフィルターする
            // &表示したいメタデータを書くrowsにマージする必要がある。
            sample_data = data[0].val;
            // 表示するデータのみ残す
            sample_data = arrange_data(sample_data);

            /*
            var scalex = d3.scaleLinear().range([0, cell_w - cell_padding_l * 2]).domain([0, d3.max(sample_data, function (d) {
                return d.value
            })]);
            */
            // domainを全ての遺伝子で固定
            scalex.range([0, cell_w - cell_padding_l * 2]).domain(default_domain);

            // legende設定
            colors.domain(d3.map(sample_data, function (d) {
                // どまいんにgene_idを渡す
                return d["sample type"]
            }).keys());

            chart_header.selectAll("th")
                .data(d3.entries(sample_data[0]))
                .exit().remove();

            chart_header.selectAll("th")
                .data(d3.entries(sample_data[0]))
                .enter().append("th")
                .append(function (d) {
                    return draw_axis(d)
                });

            draw_chart(sample_data);

            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            legend.scale(colors);
            legend_view.call(legend);


            // 発現値のx軸を描画する
            function draw_axis(d) {
                // columnごと{key, value}が渡される
                var div = document.createElement("div");

                if (d.key == "value"){
                        var svg = d3.select(div).attr("class", "tpm").append("svg")
                            .attr("class", "xscale")
                            .attr("width",cell_w + cell_padding_r + cell_padding_l)
                            .attr("height", 35);
                        var xscale = d3.scaleLinear().domain([0, tmp_max]).range([0, cell_w - (cell_padding_l*2)]);
                        svg.append("g").attr("transform", "translate(2,30)")
                            .call(d3.axisTop(xscale));
                        svg.append("g").attr("transform", "translate(" + (cell_w/2 - 10)  + ",8)").append("text").text("TPM");
                        //d3.select(div).append("span").style("margin-top", "6px").append("i").attr("class","fas fa-sort");

                    return div
                } else {
                    d3.select(div)
                        .html(d.key );
                        //.html(d.key + ' <i class="fas fa-sort"></i>');
                    return div
                }
            }

            // Bootstrap table dynamic scroll table
           if($.fn.dataTable.isDataTable("#refex_table")){
                var dtable = $("refex_table").DataTable;
                console.log("#1")
            }else{
                console.log("#2")
                $('#refex_table').DataTable({
                    "destroy":true,
                    "searching": false,
                    "paging":false,
                    "scrollY": "70vh",
                    "ordering": false,
                     "scrollCollapse": true,
                });
            }

            $('.dataTables_length').addClass('bs-select');

        }
    };

    bbchart.types.isGrouped = {
        chart: function (data) {
            reset_chart();

            // s_r_infsからval（sampleの情報）のみのobjctを生成
            var sample_vals = [];
            data.forEach(function(d){
                sample_vals.push(d.val)
            });

            // 元データのオブジェクトに、screenerで選択した比較する遺伝子のvalueを加える（values: list）
            sample_data = sample_vals[0].map(function (d,i) {
                var vals = [];
                sample_vals.forEach(function (e) {
                    vals.push(e[i]["value"])
                });
                d["values"] = vals;
                return d

            });
            // 不必要な項目をのぞいて、重複する項目を削除
            sample_data = arrange_grouped_data(sample_data);
            tbody.selectAll(".table_row").remove();

            // domainは[0, 8]に固定
            scalex.range([0, cell_w - cell_padding_l * 2]).domain(default_domain);

            // 遺伝子ごと色分けするスケール
            gene_names = s_r_infs.map(function(d){
                // symbolまたはgene idのarray
                var s = d.info.symbol ? d.info.symbol : d.info.id;
                return s
            });
            //colors.domain([...Array(sample_data[0].values.length).keys()]);
            colors.domain(gene_names);

            chart_header.selectAll("th")
                .data(d3.entries(sample_data[0]))
                .enter().append("th")
                .append(function (d) {
                    return draw_axis(d)
                });

            draw_charts(sample_data);
            grouped = true;

            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            legend.scale(colors);
            legend_view.call(legend);

            // grouped chartのデータを整形
            function arrange_grouped_data(d){
                var arranged_data = d.map(function(e){
                    var obj = {};
                    group_cols.forEach(function (c) {
                        obj[c] = e[c]
                    });
                    return obj
                });
                return arranged_data
            }

            // Bootstrap table dynamic scroll table
            if($.fn.dataTable.isDataTable("#refex_table")){
                table = $("refex_table").DataTable;
            }else{
                $('#refex_table').DataTable({
                    "searching": false,
                    "paging":false,
                    "scrollY": "75vh",
                    "ordering": false,
                    "scrollCollapse": true,
                });
            }
            $('.dataTables_length').addClass('bs-select');


        }
    };

    // bar, axis, brushを削除する
    function reset_chart() {
        chart_header.selectAll("th").remove();
        tbody.selectAll("tr").remove();
        legend_view.selectAll('.legendCells').remove();
        $("#dataTable_scroll").find("thead tr th").remove()
    }


    // 発現が類似する遺伝子を表示する
    // 遺伝子の選択操作はgroup viewの表示のトリガとする
    function show_screener(){
        // feature gene : gid
        // 遺伝子類似度データを読み込む
        var gene_list = [];
        get_similar_gene()
            .then(function (value) {
                return value
            })
            .then(function(lst){
                get_gene_info(lst)
                    .then(function(info){
                        obs.trigger("similarGeneLoaded", info)
                    });
            });

        // モーダルウィンドウに遺伝子名を書き出し、モーダルウィンドウを表示する
        $("#similargenes").modal();
        //$("#ps_screener").modal()

    }

    // 入力したgidとの類似度を取得し、類似度の高い遺伝子３位までのgidを取得する
    function get_similar_gene() {
        return new Promise(function(resolve){
            var target_dst = refex_api + 'similarity/'+ gid;
            d3.queue()
                .defer(d3.text, './data/gene_list_human.txt')
                .defer(d3.json, target_dst)
                .await(function(error, g, d){
                    var dst = d['dist'];
                    glst = g.split(','); //gene idのリスト
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

    // riot tagか利用するため、グローバルな関数として定義
     get_similar_info = function (g, n, s){
        gid = g;
        org = $("[name=orgs]:checked").val();
        ginf = {gid: gid, name: n, symbol: s, organism: org};
        if(!r_infs[gid]) get_refex_info(gid);
        $("#similargenes").modal('hide');
    };


    /*
    sample_data（s_r_infs[0].value）をsort
    */
    function sort_data(p) {
        var tmp_data = s_r_infs[0].val.slice();
        var sample_data_sorted = tmp_data.sort(function (a, b) {
            return b.value - a.value
        });
        return sample_data_sorted
    }

    function sort_group_data() {
        // TPMの値の(max - min)の差でsample_dataをソートし返す
        sample_data.forEach(function(d){
            d.dif = d3.max(d.values) - d3.min(d.values)
        });
        var sorted_data = sample_data.sort(function(a, b){
            return b.dif - a.dif
        });

        sorted_data.forEach(function (d) {
            delete d.dif;
        });

        return sorted_data
    }

    // 置き換え検討。APIがname: 類似度のオブジェクトを返すようにし、それに合わせる。
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

    // dataをd3.jsの描画用に整形する
    function arrange_data(d){
        arranged_data = d.map(function(e){
            var obj = {};
            // 定義済みの項目リストに合わせオブジェクトを生成
            chart_cols.forEach(function (c) {
                obj[c] = e[c]
            });
            return obj
        });
        return arranged_data
    }

    function draw_chart(d) {
        sample_info_rows = tbody.selectAll("tr")
            .data(d)
            .enter().append("tr").attr("class", "table_row").attr("height", cell_h);

        sample_info_rows.selectAll("td")
            .data(function (d) {
                // sample_dataの各要素が渡される
                //return d3.entries(d)
                // color scaleを適用するカラムは可変であるため
                // 元のオブジェクトのプロパティもvalueをのぞいて渡す
                var ori_obj = Object.assign({}, d);
                delete ori_obj.value;
                var tmp_obj = d3.entries(d);
                tmp_obj.forEach(function (e) {
                    e = Object.assign(e, ori_obj)
                })
                return tmp_obj
            })
            .enter().append("td")
            .append(function (d) {
                return convert_value(d)
            })
            .attr("class", function (d) {
                return "sample_" + d.key
            })
            .attr("height", cell_h + 7);
    }


    function draw_charts(d) {
        sample_info_rows = tbody.selectAll("tr")
            .data(d)
            .enter().append("tr").attr("class", "table_row").attr("height", cell_h);

        sample_info_rows.selectAll("td")
            .data(function(d){
                // sample_dataの各行が渡される
                // 表示する項目をfileterする
                return d3.entries(d)
            })
            .enter().append("td")
            .append(function (d) {
                return convert_values(d)
            })
            .attr("class", function (d) {
                return "sample_" + d.key
            })
            .attr("height", cell_h + 7);
    }

    // valueの項目ではsvgに変換した発現量、その他ではそのままテキストを返す
    function convert_value(d){
        var div = document.createElement("div");
        if (d.key == "value"){
            return lolipop_chart(d)
        }else{
            d3.select(div).append("text").text(d.value)
            return div
        }
    }

    function convert_values(d){
        var div = document.createElement("div");
        if (d.key == "values"){
            return lolipop_charts(d)
        }else{
            d3.select(div).append("text").text(d.value)
            return div
        }
    }


    // svg objectを生成しtable描画処理に返す
    function lolipop_chart(d){
        var scaley = d3.scaleBand().domain(["0", "1"]).range([0, cell_h]);
        var sample_chart = document.createElement("div");
        var svg = d3.select(sample_chart).append("svg")
            .attr("class", "lp_chart")
            .attr("width", cell_w + cell_padding_r).attr("height", cell_h + 7);
        var elem = svg.append("g").attr("transform", "translate(" + cell_padding_l + "," + cell_h/2 + ")");


        elem.append("line")
            .transition().duration(250)
            .attr("x1", 0)
            .attr("x2", scalex(d.value))
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("class", "chart_line")
            .attr("stroke", "steelblue");


        elem.append("circle")
            .attr("cx", scalex(d.value))
            .attr("r", 4)
            .attr("fill", function(e, i){
                return colors(d["sample type"])
            })
            .on("mouseover", function (e) {
                    hide_annotation();
                    show_annotation(d.value, d.desc, true)
            })
            .on("mouseout", function(){
                    hide_annotation()
            });

        // y axis
        svg.append("g").attr("class", "yaxis").attr("width", 5).attr("height", cell_h)
            .append("line")
            .attr("stroke", "#444")
            .attr("x1", cell_padding_l)
            .attr("x2", cell_padding_l)
            .attr("y1", 0)
            .attr("y2", cell_h + 7);

        function show_annotation(v) {
            // tpmを表示
            var w;
            var labels = [{
                note: {label: "Expression(TPM): " + v},
                dx: 30,
                dy: 0,
                x: scalex(v),
                y: 0,
            }];
            makeAnnotations = d3.annotation()
                .annotations(labels)
                .type(d3.annotationCallout);

            // annotationをcall
            elem.append("g").attr('class', 'sample-annotation').call(makeAnnotations)
        }

        return sample_chart
    }

    function lolipop_charts(d) {
        var gidx = s_r_infs.map(function (d, i) {
            return i
        });

        // yscaleには選択された遺伝子リストの序数を渡す
        var scaley = d3.scaleBand().domain(gidx).range([0, cell_h]);
        var sample_chart = document.createElement("div");
        var svg = d3.select(sample_chart).append("svg")
            .attr("class", "lp_chart")
            .attr("width", cell_w + cell_padding_r).attr("height", cell_h + 7);
        var elem = svg.append("g").attr("transform", "translate(" + cell_padding_l + "," + cell_h/2 + ")");

        // valuesをbind
        var charts = elem.selectAll(".g_chart")
            .data(d.value)
            .enter().append("g").attr("class", "g_chart").append("line")
            .attr("x1", 0)
            .attr("x2", function(e){
                return scalex(e)
            })
            .attr("y1", function(d,i){
                return scaley(i)
            })
            .attr("y2", function(d,i){
                return scaley(i)
            })
            .attr("class", "chart_line")
            .attr("stroke", "steelblue");

        elem.selectAll(".g_chart").append("circle")
            .attr("cx", function(e){
                return scalex(e)
            })
            .attr("cy", function (e,i) {
                return scaley(i)
            })
            .attr("r", 4)
            .attr("fill", function (d,i) {
                return colors(gene_names[i])
            })
            .on("mouseover", function (e, i) {
                hide_annotation();
                show_annotation(e, i)
            })
            .on("mouseout", function () {
                hide_annotation()
            });

        // y axis
        svg.append("g").attr("class", "yaxis").attr("width", 5).attr("height", cell_h)
            .append("line")
            .attr("stroke", "#444")
            .attr("x1", cell_padding_l)
            .attr("x2", cell_padding_l)
            .attr("y1", 0)
            .attr("y2", cell_h + 7);

        function show_annotation(e, i) {
            var labels = [{
                note: {label: "Expression(TPM): " + e},
                dx: 30,
                dy: -5 * i,
                x: scalex(e),
                y: scaley(i),
            }];

            makeAnnotations = d3.annotation()
                .annotations(labels)
                .type(d3.annotationCallout);

            // annotationをcall
            elem.append("g").attr('class', 'sample-annotation').call(makeAnnotations)
        }

        return sample_chart
    }

    $("#sort_bar")
        .on('click', function () {
            //hide_annotation()
            ppty = "value";

            tbody.selectAll(".table_row").remove();
            if (sorted == false && grouped == false) {
                // sortするプロパティを指定。デフォルトでtpm
                var sorted_data = sort_data(ppty);
                sorted_data = arrange_data(sorted_data);
                draw_chart(sorted_data);
                sorted = true;
                state_changed("Sorted with expression level." , "");

            }
            else if(sorted == true && grouped == false) {
                // sorted状態であれば元のデータの描画に戻る
                bbchart.chart(s_r_infs);
                sorted = false;
                state_changed("", "");
            }
            else if (sorted == false | grouped == true){
                // min-max の差分でソートする処理
                var sorted_group_data = sort_group_data();
                draw_charts(sorted_group_data)
                // headerのxaxisを変更する

                sorted = true;
                // 比較する遺伝子が追加された際の処理を検討する必要あり
                var sample_info = s_r_infs[1]["info"]["symbol"];

                state_changed("Sorted expression level difference with ", sample_info);

            } else {
                bbchart.chart(s_r_infs);
                sorted = false;
                grouped = false;
                s_r_infs = s_r_infs[0];
                state_changed("", "");
            }
    });

    function hide_annotation() {
        d3.selectAll('.sample-annotation').remove();
    }

    $("#compare_genes").click(function(){
        //hide_annotation()

        // grouped==trueであればデフォルトのチャートを表示
        // falseならscreenerを呼ぶ
        switch (grouped) {
            case  false:
                grouped = true;
                show_screener();
                break;
            case true:
                tbody.selectAll("tr.table_row").remove();
                // s_r_infsの初期化
                s_r_infs = s_r_infs.slice(0, 1);
                bbchart.chart(s_r_infs);
                grouped = false;
                state_changed("", "");
                break;
        }
    });

})();