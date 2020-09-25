//refex_screener.js 0.1
(function () {
    var api_base = "http://52.193.15.45/screen?project=cage&organism=human",
    screen_option = "",
    gene_ids, res_ids,stats_field, stats_operator, stats_val, specific, project, organism;


    $('input[name="gene_id_list"]').blur(function () {
        gene_ids = $('input[name="gene_id_list"]').val();
        if (gene_ids != 0){
            var gene_ids_option = "&ids=" + gene_ids
        }else{
            var gene_ids_option = ""
        }
        var url = api_base + gene_ids_option;
        $.getJSON(
            url,
            null,
            function (data, status) {
                console.log(data)
                show_numfound(data["numfound"])
                if (data["numfound"] != 0){
                   res_ids = data["gene_id"]
                }

            }
        )
    });

    $("#find_genes").click(function () {
        for (var i of res_ids){
            get_gene_info(i).then(function(r) {
                var tid = r['id'], name = r['value'], sym = r['Symbol'];
                get_similar_info(tid, name, sym);
            });
        }
    })

    show_numfound = function (n) {
        $("#screener_found").text(n)
    }
})();
